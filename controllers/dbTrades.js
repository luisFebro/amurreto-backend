const {
    handleList,
    checkEmptyList,
} = require("../utils/mongodb/skipLimitSort");
const AmurretoOrders = require("../models/Orders");
const {
    getTotalResults,
    getTotalFee,
    getAmountPriceResults,
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
            grossProfitAmount,
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
                grossProfitAmount,
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
