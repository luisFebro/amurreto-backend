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
        $trunc: [{ $multiply: ["$$buyBasePrice", "$$buyMarketPrice"] }, 2],
    };

    const endQuotePrice = {
        $trunc: [{ $multiply: ["$$sellBasePrice", "$$sellMarketPrice"] }, 2],
    };

    const totalFeeAmount = getTotalFee("amount");

    const grossProfitAmount = { $subtract: [endQuotePrice, startQuotePrice] };
    // if grossProfitAmount is NEGATIVE, then FEES is ADDED. e.g -1.00 - 0.40 (total fee) ==> - plus - equal +
    // if grossProfitAmount is POSITIVE, then FEES is SUBTRACTED. e.g 1.00 - 0.40 (total fee) + plus - equal -
    const netProfitAmount = {
        $subtract: [grossProfitAmount, totalFeeAmount],
    };

    const finalBalanceAmount = {
        $add: [startQuotePrice, netProfitAmount],
    };

    const dataForTotalResults = {
        netProfitAmount,
        startQuotePrice,
        sellMarketPrice: "$$sellMarketPrice",
        finalBalanceAmount,
    };

    const dataForDbTrades = {
        grossProfitAmount,
        netProfitAmount,
        finalBalanceAmount,
    };

    const finalData =
        file === "totalResults" ? dataForTotalResults : dataForDbTrades;

    return {
        results: {
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
                        in: getAmountPriceResults(),
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
            finalBalanceAmount,
            netProfitAmount,
            startQuotePrice,
            sellMarketPrice,
        } = currResults;

        const isCurrentTrading = !sellMarketPrice;
        if (isCurrentTrading) {
            return {
                netProfitPerc: 0,
                netProfitAmount: 0,
            };
        }

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

module.exports = {
    getAmountPriceResults,
    getTotalResults,
    getTotalFee,
};

// HELPERS
// async function getLiveTotalData(data) {
//     const pendingList = data[0] && data[0].list;
//     const gotListData = Boolean(pendingList && pendingList[0].buyTableList && pendingList[0].buyTableList.date.length); // if not date, it means no other data is available. This happens when an order is cancelled with LIMIT order
//     if(!pendingList || !gotListData) return [{ list: [{}], listTotal : 0, chunksTotal: 0 }];

//     const symbolsList = [...new Set(pendingList.map(data => data.symbol))];
//     const requestList = symbolsList.map(symbol => getCandlesticksData({ symbol, onlyLiveCandle: true }))
//     const allLiveCandlesData = await Promise.all(requestList);

//     const updatedData = pendingList.map(tradeData => {
//         const {
//             symbol: currSymbol,
//             buyTableList,
//             basePrice,
//             buyMarketPrice,
//         } = tradeData;

//         const foundLiveCandle = allLiveCandlesData.find(d => d.symbol === currSymbol);
//         if(!foundLiveCandle) return tradeData;

//         const {
//             liveCandleClose,
//         } = foundLiveCandle;
//         const { fee } = buyTableList;

//         const liveEndQuotePrice = Number((basePrice * liveCandleClose).toFixed(2));

//         // FEES
//         const totalFeeBuyAmount = fee.amount.reduce((acc, next) => acc + next, 0);
//         const totalFeeBuyPerc = fee.perc.reduce((acc, next) => acc + next, 0);
//         const totalFeeSellAmount = getPercentage(liveEndQuotePrice, TAKER_MARKET_FEE, { mode: "value" });

//         const totalFeeAmount = Number((totalFeeBuyAmount + totalFeeSellAmount).toFixed(2));
//         const totalFeePerc = Number((totalFeeBuyPerc + TAKER_MARKET_FEE).toFixed(2));
//         // END FEES

//         // RESULT AND PROFITS
//         const startQuotePrice = Number((basePrice * buyMarketPrice).toFixed(2));

//         const liveGrossProfitAmount = Number((liveEndQuotePrice - startQuotePrice).toFixed(2))
//         const liveNetProfitAmount = Number((liveEndQuotePrice - (startQuotePrice + totalFeeAmount)).toFixed(2));
//         const liveFinalBalanceAmount = startQuotePrice + liveNetProfitAmount;
//         const liveFinalGrossBalanceAmount = startQuotePrice + liveGrossProfitAmount;
//         // END RESULT AND PROFITS
//         return {
//             ...tradeData,
//             sellMarketPrice: liveCandleClose,
//             totalFeeAmount,
//             totalFeeSellAmount,
//             totalFeePerc,
//             results: {
//                 netProfitAmount: liveNetProfitAmount,
//                 finalBalanceAmount: liveFinalBalanceAmount,
//             }
//             // sellTableList: { quoteAndTransPerc, fee: {}}
//         }
//     })

//     data[0].list = updatedData;
// }

// function getTableList(type) {
//     const main = `$$elem.${type}Prices`;

//     return({
//         date: `${main}.timestamp`,
//         quoteAndTransPerc: {
//             amount: `${main}.amounts.quote`,
//             transactionPositionPerc: `${main}.transactionPositionPerc`,
//         },
//         base: `${main}.amounts.base`,
//         market: `${main}.amounts.market`,
//         strategy: `${main}.strategy`,
//         orderType: `${main}.type`,
//         fee: {
//             perc: `${main}.fee.perc`,
//             amount: `${main}.fee.amount`,
//         }
//     });
// }
// END HELPERS
