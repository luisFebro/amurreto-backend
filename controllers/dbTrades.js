const AmurretoOrders = require("../models/Orders");
const {
    handleList,
    checkEmptyList,
} = require("../utils/mongodb/skipLimitSort");
const reduceQuery = require("../utils/mongodb/reduceQuery");
const { getCandlesticksData } = require("./klines/candlesticks");
const { TAKER_MARKET_FEE } = require("./fees");
const getPercentage = require("../utils/number/perc/getPercentage")

exports.readTradesHistory = async (req, res) => {
    const data = await readTradesHistoryBack(req.query);

    const emptyListRes = checkEmptyList(data);
    if (emptyListRes) return res.json(emptyListRes);

    return res.json(data[0]);
};

async function readTradesHistoryBack(payload = {}) {
    const { skip = 0, limit = 5, status } = payload;
    const isPending = status === "pending";

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
        sellTableList: getTableList("sell"),
        buyTableList: getTableList("buy"),
        symbol: { $first: "$list.symbol" },
        status: { $first: "$list.status" },
        statusExchange: { $first: "$list.statusExchange" },
        capitalPosition: {
            $first: "$list.capitalPosition",
        },
        buyMarketPrice: {
            $last: "$$elem.buyPrices.amounts.market",
        }, // by default, all items follows First In Algo, the most recent elem will be inserted first. So $last it will be the first buy value and $first will get the most recent selling price
        sellMarketPrice: {
            $first: "$$elem.sellPrices.amounts.market",
        },
        basePrice: {
            $last: "$$elem.buyPrices.amounts.base",
        },
        createdAt: "$$elem.createdAt",
        totalFeePerc: {
            $trunc: [
                {
                    $add: [
                        reduceQuery(
                            "$$elem.buyPrices.fee.perc"
                        ),
                        reduceQuery(
                            "$$elem.sellPrices.fee.perc"
                        ),
                    ],
                },
                1,
            ],
        },
        totalFeeAmount,
        results: {
            $let: {
                vars: {
                    basePrice: {
                        $last:
                            "$$elem.buyPrices.amounts.base",
                    },
                    buyMarketPrice: {
                        $last:
                            "$$elem.buyPrices.amounts.market",
                    },
                    sellMarketPrice: {
                        $first:
                            "$$elem.sellPrices.amounts.market",
                    },
                },
                in: {
                    grossProfitAmount: {
                        $subtract: [
                            endQuotePrice,
                            startQuotePrice,
                        ],
                    },
                    netProfitAmount,
                    finalBalanceAmount: {
                        $add: [
                            startQuotePrice,
                            netProfitAmount,
                        ],
                    },
                },
            },
        },
    };

    // remove unecessary data for DB query which requires selling data which live trades do not own it until an selling order
    if(isPending) {
        delete allListData.sellMarketPrice;
        delete allListData.sellTableList;
        delete allListData.totalFeeAmount;
        delete allListData.totalFeePerc;
        delete allListData.results;
    }

    const mainAggr = [
        {
            $match: {
                status,
            },
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

    const data = await AmurretoOrders.aggregate([
        ...mainAggr,
        ...handleList({ skip, limit }),
    ]);

    if(isPending) {
        // handle live candle need:
        const pendingList = data[0] && data[0].list;
        if(!pendingList) return [{}];

        const symbolsList = [...new Set(pendingList.map(data => data.symbol))];
        const requestList = symbolsList.map(symbol => getCandlesticksData({ symbol, onlyLiveCandle: true }))
        const allLiveCandlesData = await Promise.all(requestList);

        const updatedData = pendingList.map(tradeData => {
            const {
                symbol: currSymbol,
                buyTableList,
                basePrice,
                buyMarketPrice,
            } = tradeData;

            const foundLiveCandle = allLiveCandlesData.find(d => d.symbol === currSymbol);
            if(!foundLiveCandle) return tradeData;

            const {
                liveCandleClose,
            } = foundLiveCandle;
            const { fee } = buyTableList;

            const liveEndQuotePrice = Number((basePrice * liveCandleClose).toFixed(2));

            // FEES
            const totalFeeBuyAmount = fee.amount.reduce((acc, next) => acc + next, 0);
            const totalFeeBuyPerc = fee.perc.reduce((acc, next) => acc + next, 0);
            const totalFeeSellAmount = getPercentage(liveEndQuotePrice, TAKER_MARKET_FEE, { mode: "value" });

            const totalFeeAmount = Number((totalFeeBuyAmount + totalFeeSellAmount).toFixed(2));
            const totalFeePerc = Number((totalFeeBuyPerc + TAKER_MARKET_FEE).toFixed(2));
            // END FEES

            // RESULT AND PROFITS
            const startQuotePrice = Number((basePrice * buyMarketPrice).toFixed(2));

            const liveGrossProfitAmount = Number((liveEndQuotePrice - startQuotePrice).toFixed(2))
            const liveNetProfitAmount = Number((liveEndQuotePrice - (startQuotePrice + totalFeeAmount)).toFixed(2));
            const liveFinalBalanceAmount = startQuotePrice + liveNetProfitAmount;
            const liveFinalGrossBalanceAmount = startQuotePrice + liveGrossProfitAmount;
            // END RESULT AND PROFITS
            return {
                ...tradeData,
                sellMarketPrice: liveCandleClose,
                totalFeeAmount,
                totalFeeSellAmount,
                totalFeePerc,
                results: {
                    grossProfitAmount: liveGrossProfitAmount,
                    netProfitAmount: liveNetProfitAmount,
                    finalBalanceAmount: liveFinalBalanceAmount,
                    finalGrossBalanceAmount: liveFinalGrossBalanceAmount,
                }
                // sellTableList: { quoteAndTransPerc, fee: {}}
            }
        })

        data[0].list = updatedData;
    }

    return data;
}

// HELPERS
function getTableList(type) {
    const main = `$$elem.${type}Prices`;

    return({
        date: `${main}.timestamp`,
        quoteAndTransPerc: {
            amount: `${main}.amounts.quote`,
            transactionPositionPerc: `${main}.transactionPositionPerc`,
        },
        base: `${main}.amounts.base`,
        market: `${main}.amounts.market`,
        strategy: `${main}.strategy`,
        orderType: `${main}.type`,
        fee: {
            perc: `${main}.fee.perc`,
            amount: `${main}.fee.amount`,
        }
    });
}
// END HELPERS
// readTradesHistoryBack({ status: "done" })
// .then(res => console.log(JSON.stringify(res)))