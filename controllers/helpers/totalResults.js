const AmurretoOrders = require("../../models/Orders");
const reduceQuery = require("../../utils/mongodb/reduceQuery");
// const { TAKER_MARKET_FEE } = require("../fees");
const getPercentage = require("../../utils/number/perc/getPercentage");

async function getTotalResults() {
    // payload = {}

    const startQuotePrice = {
        $trunc: [{ $multiply: ["$$basePrice", "$$buyMarketPrice"] }, 2],
    };
    const endQuotePrice = {
        $trunc: [{ $multiply: ["$$basePrice", "$$sellMarketPrice"] }, 2],
    };
    const totalFeeAmount = {
        $trunc: [
            {
                $add: [
                    reduceQuery("$$elem.buyPrices.fee.amount"),
                    reduceQuery("$$elem.sellPrices.fee.amount"),
                ],
            },
            2,
        ],
    };

    const netProfitAmount = {
        $subtract: [
            { $subtract: [endQuotePrice, startQuotePrice] },
            totalFeeAmount,
        ],
    };

    const allListData = {
        symbol: { $first: "$list.symbol" },
        status: "$list.status",
        buyList: "$$elem.buyPrices",
        results: {
            $let: {
                vars: {
                    basePrice: {
                        $last: "$$elem.buyPrices.amounts.base",
                    },
                    buyMarketPrice: {
                        $last: "$$elem.buyPrices.amounts.market",
                    },
                    sellMarketPrice: {
                        $first: "$$elem.sellPrices.amounts.market",
                    },
                },
                in: {
                    grossProfitAmount: {
                        $subtract: [endQuotePrice, startQuotePrice],
                    },
                    netProfitAmount,
                    finalBalanceAmount: {
                        $add: [startQuotePrice, netProfitAmount],
                    },
                },
            },
        },
    };

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
                        in: allListData,
                    },
                },
            },
        },
    ];

    const data = await AmurretoOrders.aggregate([...mainAggr]);

    const allOrdersList = data[0] && data[0].list;
    if (!allOrdersList)
        return {
            totalNetProfitPerc: 0,
            totalNetProfitAmount: 0,
        };
    const statusList = allOrdersList && allOrdersList[0].status;

    const finalTotalResult = statusList.map((status, ind) => {
        const currResults = allOrdersList[ind];

        const { finalBalanceAmount, netProfitAmount } = currResults.results;

        if (status === "pending") {
            const buyList = allOrdersList[ind].buyList;
            const gotListData = buyList.length;

            if (!gotListData || !finalBalanceAmount) {
                return {
                    netProfitPerc: 0,
                    netProfitAmount: 0,
                };
            }
        }

        const netProfitPerc = getPercentage(
            finalBalanceAmount,
            netProfitAmount,
            {
                toFixed: 2,
            }
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

module.exports = getTotalResults;
