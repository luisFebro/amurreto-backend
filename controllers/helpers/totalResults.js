const AmurretoOrders = require("../../models/Orders");
const reduceQuery = require("../../utils/mongodb/reduceQuery");
const getIncreasedPerc = require("../../utils/number/perc/getIncreasedPerc");

const getReduceForPartials = (input) => {
    const reduceForPartials = {
        $reduce: {
            input,
            initialValue: [],
            in: {
                $sum: { $concatArrays: ["$$value", "$$this"] },
            },
        },
    };

    return { $cond: [{ $isArray: reduceForPartials }, 0, reduceForPartials] };
};

// LESSON: do not confuse the perc fee with actual perc amount when adding both buy/sell fees
function getTotalFee(type = "amount") {
    const allowedTypes = ["amount", "perc"];
    if (!allowedTypes.includes(type)) throw new Error("Wrong type.");

    const truncCount = type === "amount" ? 2 : 1;

    return {
        $trunc: [
            {
                $add: [
                    reduceQuery(`$$elem.buyPrices.fee.${type}`),
                    reduceQuery(`$$elem.sellPrices.fee.${type}`),
                    getReduceForPartials(
                        `$$elem.buyPrices.partialOrderData.history.fee.${type}`
                    ),
                    getReduceForPartials(
                        `$$elem.sellPrices.partialOrderData.history.fee.${type}`
                    ),
                ],
            },
            truncCount,
        ],
    };
}

function getAmountPriceResults(file = "totalResults") {
    // ATENTION: startFeeAmount is included implicitly in the selling price.endQuotePrice
    // since the exchange already discounted the fee and no need to discount them again
    // but the selling price is the gross value and it does require to discount fee.

    const startQuotePrice = {
        $last: "$$elem.buyPrices.amounts.quote",
    };

    const endQuotePrice = {
        $last: "$$elem.sellPrices.amounts.quote",
    };
    const endFeeAmount = {
        $last: "$$elem.sellPrices.fee.amount",
    };

    const buyPartialOrdersData = `$$elem.buyPrices.partialOrderData.history`;
    const sellPartialOrdersData = `$$elem.sellPrices.partialOrderData.history`;

    // since the getPercentage Increment is a method detached from DB, it can not be used here
    const dataForTotalResults = {
        startQuotePrice,
        endQuotePrice,
        endFeeAmount,
        buyPartialOrdersData,
        sellPartialOrdersData,
        sellMarketPrice: "$$sellMarketPrice",
    };

    const dataForDbTrades = {
        startQuotePrice,
        endQuotePrice,
        endFeeAmount,
        buyPartialOrdersData,
        sellPartialOrdersData,
    };

    const finalData =
        file === "totalResults" ? dataForTotalResults : dataForDbTrades;

    return {
        $let: {
            vars: {
                sellMarketPrice: {
                    $first: "$$elem.sellPrices.amounts.market",
                },
            },
            in: finalData,
        },
    };
}

async function getTotalResults() {
    const mainAggr = [
        {
            $match: {},
        },
        {
            $group: {
                _id: null,
                list: {
                    $push: "$$ROOT",
                },
            },
        },
        {
            $project: {
                list: {
                    $map: {
                        input: "$list",
                        as: "elem",
                        in: {
                            results: getAmountPriceResults(),
                        },
                    },
                },
            },
        },
        {
            $unwind: "$list",
        },
        {
            $replaceWith: { $ifNull: ["$list.results", {}] },
        },
    ];

    const allOrdersList = await AmurretoOrders.aggregate([...mainAggr]);

    if (!allOrdersList.length)
        return {
            totalNetProfitPerc: 0,
            totalNetProfitAmount: 0,
        };

    const finalTotalResult = allOrdersList.map((currResults) => {
        const {
            sellPartialOrdersData,
            buyPartialOrdersData,
            startQuotePrice,
            sellMarketPrice,
            endQuotePrice,
            endFeeAmount,
        } = currResults;

        const isCurrentTrading = !sellMarketPrice;
        if (isCurrentTrading) {
            return {
                netProfitPerc: 0,
                netProfitAmount: 0,
            };
        }

        const { netProfitPerc, netProfitAmount } = getFinalBalanceData({
            startQuote: startQuotePrice,
            endQuote: endQuotePrice,
            endFee: endFeeAmount,
            sellPartialOrders: sellPartialOrdersData,
            buyPartialOrders: buyPartialOrdersData,
        });

        return {
            netProfitPerc,
            netProfitAmount,
        };
    });

    const perc = finalTotalResult.reduce(
        (acc, next) => acc + next.netProfitPerc,
        0
    );

    const amount = finalTotalResult.reduce(
        (acc, next) => acc + next.netProfitAmount,
        0
    );

    return {
        totalNetProfitPerc: Number(perc.toFixed(2)),
        totalNetProfitAmount: Number(amount.toFixed(2)),
    };
}

// HELPERS
// these values should already be combined with partial orders ones
const getQuoteWithPartialData = ({
    startQuote,
    endQuote,
    buyPartialOrders,
    sellPartialOrders,
}) => {
    let thisStartQuote = startQuote;
    let thisEndQuote = endQuote;

    const gotBuyPartialOrders = Boolean(
        buyPartialOrders && buyPartialOrders.length
    );
    if (gotBuyPartialOrders) {
        buyPartialOrders.forEach((orders) => {
            return orders.forEach((order) => {
                const partialStartQuote = order.amounts.quote;
                thisStartQuote += partialStartQuote;
            });
        });
    }

    const gotSellPartialOrders = Boolean(
        sellPartialOrders && sellPartialOrders.length
    );
    if (gotSellPartialOrders) {
        sellPartialOrders.forEach((orders) => {
            return orders.forEach((order) => {
                const partialEndQuote = order.amounts.quote;
                thisEndQuote += partialEndQuote;
            });
        });
    }

    return {
        thisStartQuote,
        thisEndQuote,
    };
};

function getFinalBalanceData({
    startQuote,
    endQuote,
    endFee,
    sellPartialOrders,
    buyPartialOrders,
}) {
    const { thisStartQuote, thisEndQuote } = getQuoteWithPartialData({
        startQuote,
        endQuote,
        buyPartialOrders,
        sellPartialOrders,
    });

    const finalBalanceAmount = thisEndQuote - endFee;

    // netProfitPerc takes initial investiment and subtract with final balance which discounts the fees in both buy/sell prices.
    const netProfitPerc = getIncreasedPerc(thisStartQuote, finalBalanceAmount);

    return {
        finalBalanceAmount,
        netProfitAmount: finalBalanceAmount - thisStartQuote,
        netProfitPerc,
    };
}
// END HELPERS

// getTotalResults().then(console.log);

module.exports = {
    getFinalBalanceData,
    getAmountPriceResults,
    getTotalResults,
    getTotalFee,
};
