const {
    handleList,
    checkEmptyList,
} = require("../utils/mongodb/skipLimitSort");
const AmurretoOrders = require("../models/Orders");
const {
    getTotalResults,
    getTotalFee,
    getAmountPriceResults,
    getFinalBalanceData,
} = require("./helpers/totalResults");
const getLiveCandle = require("./live-candle/liveCandle");

const totalFeeAmount = getTotalFee("amount");
const totalFeePerc = getTotalFee("perc");

exports.readTradesHistory = async (req, res) => {
    const data = await readTradesHistoryBack(req.query);

    const emptyListRes = checkEmptyList(data);
    if (emptyListRes) return res.json(emptyListRes);

    return res.json(data[0]);
};

exports.getTotalResults = async (req, res) => {
    const result = await getTotalResults();

    return res.json(result);
};

async function readTradesHistoryBack(payload = {}) {
    const { skip = 0, limit = 5, status } = payload;
    const isPending = status === "pending";

    const allListData = {
        sellTableList: getTableList("sell"),
        buyTableList: getTableList("buy"),
        symbol: { $first: "$list.symbol" },
        status: { $first: "$list.status" },
        statusExchange: { $first: "$list.statusExchange" },
        capitalPosition: {
            $first: "$list.capitalPosition", // this is returning the wrong value, only the first transaction, replace it with actullay buy history
        },
        buyBasePrice: {
            $last: "$$elem.buyPrices.amounts.base",
        },
        buyMarketPrice: {
            $last: "$$elem.buyPrices.amounts.market",
        }, // by default, all items follows First In Algo, the most recent elem will be inserted first. So $last it will be the first buy value and $first will get the most recent selling price
        sellMarketPrice: {
            $first: "$$elem.sellPrices.amounts.market",
        },
        createdAt: "$$elem.createdAt",
        totalFeePerc,
        totalFeeAmount,
        results: getAmountPriceResults("dbTrades"),
    };

    // remove unecessary data for DB query which requires selling data which live trades do not own it until an selling order
    if (isPending) {
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

    // handling balance considering partial orders
    const finalOrderList = data.map((o) => {
        const list = o.list;
        return list.map((order) => {
            const results = order.results || {};

            const buyPartialOrders = results.buyPartialOrdersData;
            const sellPartialOrders = results.sellPartialOrdersData;

            const buyTableList = handleTableWithPartialOrders({
                tableList: order.buyTableList,
                partialOrders: buyPartialOrders,
            });
            const sellTableList = handleTableWithPartialOrders({
                tableList: order.sellTableList,
                partialOrders: sellPartialOrders,
            });

            const finalDataBalance = getFinalBalanceData({
                startQuote: results.startQuotePrice,
                endQuote: results.endQuotePrice,
                endFee: results.endFeeAmount,
                sellPartialOrders,
                buyPartialOrders,
            });

            return {
                ...order,
                sellTableList,
                buyTableList,
                results: finalDataBalance,
            };
        });
    });

    data[0].list = finalOrderList[0];
    // end handling balance considering partial orders

    if (isPending) {
        const pendingList = data[0] && data[0].list;

        // handle live candle need:
        const gotListData = Boolean(
            pendingList &&
                pendingList[0].buyTableList &&
                pendingList[0].buyTableList.date.length
        ); // if not date, it means no other data is available. This happens when an order is cancelled with LIMIT order
        if (!pendingList || !gotListData)
            return [{ list: [], listTotal: 0, chunksTotal: 0 }];

        const updatedPendingData = await getPendingListData({
            tradeData: pendingList[0],
        });

        data[0].list = [updatedPendingData];
    }

    if (!data.length) return [{ list: [], listTotal: 0, chunksTotal: 0 }];

    return data;
}

// readTradesHistoryBack({ status: "done" }).then((res) =>
//     console.log(JSON.stringify(res))
// );

// HELPERS
function handleTableWithPartialOrders({ tableList, partialOrders = [] }) {
    if (!partialOrders || partialOrders.length) return tableList;

    const finalTable = {
        date: [...tableList.date],
        base: [...tableList.base],
        market: [...tableList.market],
        orderType: [...tableList.orderType],
        strategy: [...tableList.strategy],
        quoteAndTransPerc: {
            transactionPositionPerc: [
                ...tableList.quoteAndTransPerc.transactionPositionPerc,
            ],
            amount: [...tableList.quoteAndTransPerc.amount],
        },
        fee: {
            perc: [...tableList.fee.perc],
            amount: [...tableList.fee.amount],
        },
    };

    // reverse so that we can have the right order: first is the last filled order, then as the partial orders are pushed and the newly added ones are the late ones, then we reverse to have the right order
    partialOrders.reverse().forEach((partial) => {
        const partialData = partial[0];

        finalTable.date.push(partialData.timestamp);
        finalTable.base.push(partialData.amounts.base);
        finalTable.market.push(partialData.amounts.market);
        finalTable.orderType.push("LIMIT"); // it is always limit when partial order
        finalTable.strategy.push(partialData.strategy);
        finalTable.fee.amount.push(partialData.fee.amount);
        finalTable.fee.perc.push(partialData.fee.perc);
        finalTable.quoteAndTransPerc.amount.push(partialData.amounts.quote);
        finalTable.quoteAndTransPerc.transactionPositionPerc.push(100);
    });
    return finalTable;
}

// in this version, only accepting BTC and one pending transaction
// if eventually is required to manage multiple pending trnsactions, it is required to create an syncronous function to get live candle data later so that we can loop through the pending list
async function getPendingListData({ tradeData }) {
    const run = async (resolve, reject) => {
        if (!tradeData) return reject("no pendingList");

        const { symbol, buyBasePrice, buyMarketPrice, buyTableList } =
            tradeData;
        if (!symbol) return tradeData;

        const { fee } = buyTableList;
        const buyFeeAmount = fee && fee.amount[0];

        const liveCandleData = await getLiveCandle({
            symbol,
            buyBaseAmount: buyBasePrice,
            buyMarketPrice,
            buyFeeAmount,
        });

        const {
            startQuotePrice,
            liveCandleClose,
            fee: liveFee,
            liveResult,
        } = liveCandleData;

        const {
            perc: totalFeePerc,
            amount: totalFeeAmount,
            sellFeeAmount,
        } = liveFee;

        const {
            netProfitAmount,
            netProfitPerc,
            balanceAmount,
            grossBalanceAmount,
        } = liveResult;

        return resolve({
            ...tradeData,
            sellMarketPrice: liveCandleClose,
            totalFeeAmount,
            totalFeeSellAmount: sellFeeAmount,
            totalFeePerc,
            results: {
                netProfitAmount,
                netProfitPerc,
                finalBalanceAmount: balanceAmount,
                finalGrossBalanceAmount: grossBalanceAmount,
                startQuotePrice,
            },
        });
    };

    return new Promise(run);
}

function getTableList(type) {
    const main = `$$elem.${type}Prices`;

    return {
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
        },
    };
}
// END HELPERS
