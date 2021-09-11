const AmurretoOrders = require("../../models/Orders");
const reduceQuery = require("../../utils/mongodb/reduceQuery");
// const { TAKER_MARKET_FEE } = require("../fees");
const getIncreasedPerc = require("../../utils/number/perc/getIncreasedPerc");

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
                ],
            },
            truncCount,
        ],
    };
}

function getAmountPriceResults(file = "totalResults") {
    const startQuotePrice = {
        $last: "$$elem.buyPrices.amounts.quote",
    };
    const startFeeAmount = {
        $last: "$$elem.buyPrices.fee.amount",
    };

    const endQuotePrice = {
        $last: "$$elem.sellPrices.amounts.quote",
    };
    const endFeeAmount = {
        $last: "$$elem.sellPrices.fee.amount",
    };
    // $trunc: [{ $multiply: ["$$sellBasePrice", "$$sellMarketPrice"] }, 2],
    // };

    const grossProfitAmount = { $subtract: [endQuotePrice, startQuotePrice] };

    const startNetProfitPrice = {
        $subtract: [startQuotePrice, startFeeAmount],
    };
    const endNetProfitPrice = { $subtract: [endQuotePrice, endFeeAmount] };
    const netProfitAmount = {
        $subtract: [endNetProfitPrice, startNetProfitPrice],
    };

    const finalBalanceAmount = endNetProfitPrice;

    // since the getPercentage Increment is a method detached from DB, it can not be used here
    const dataForTotalResults = {
        startNetProfitPrice,
        finalBalanceAmount,
        startQuotePrice,
        netProfitAmount,
        sellMarketPrice: "$$sellMarketPrice",
    };

    const dataForDbTrades = {
        startNetProfitPrice,
        finalBalanceAmount,
        grossProfitAmount,
        netProfitAmount,
        startQuotePrice,
    };

    const finalData =
        file === "totalResults" ? dataForTotalResults : dataForDbTrades;

    return {
        $let: {
            vars: {
                // $first is need here because we are looking in an array and to have the value use $first or $reduce if multiple in future updates.
                buyBasePrice: {
                    $first: "$$elem.buyPrices.amounts.base",
                },
                buyMarketPrice: {
                    $first: "$$elem.buyPrices.amounts.market",
                },
                sellBasePrice: {
                    $first: "$$elem.sellPrices.amounts.base",
                },
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
            startQuotePrice,
            finalBalanceAmount,
            netProfitAmount,
            sellMarketPrice,
        } = currResults;

        const isCurrentTrading = !sellMarketPrice;
        if (isCurrentTrading) {
            return {
                netProfitPerc: 0,
                netProfitAmount: 0,
            };
        }

        // netProfitPerc takes initial investiment and subtract with final balance which discounts the fees in both buy/sell prices.
        const netProfitPerc = getIncreasedPerc(
            startQuotePrice,
            finalBalanceAmount
        );

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

// getTotalResults().then(console.log);

module.exports = {
    getAmountPriceResults,
    getTotalResults,
    getTotalFee,
};
