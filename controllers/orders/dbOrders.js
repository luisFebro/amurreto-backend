const AmurretoOrders = require("../../models/Orders");
const { pushFIFO } = require("../../utils/mongodb/fifo");
const LiveCandleHistory = require("../../models/LiveCandleHistory");
const partialFilled = require("./partialFilled");
// const getPercentage = require("../utils/number/perc/getPercentage");

async function recordFinalDbOrder({
    needLimitTypeOnly = false,
    side,
    mostRecentData,
    moreData,
}) {
    const handleLimitTypeOnly = async () => {
        if (!needLimitTypeOnly) return null;
        const LIVE_CANDLE_ID = "613ed80dd3ce8cd2bbce76cb";

        const dataToUpdate = {
            "pendingLimitOrder.signal": null,
            "pendingLimitOrder.count": 0,
            "pendingLimitOrder.attempts": 0,
            "pendingLimitOrder.openOrderId": null,
            "pendingLimitOrder.strategy": null,
        };

        return await LiveCandleHistory.findByIdAndUpdate(
            LIVE_CANDLE_ID,
            dataToUpdate
        );
    };

    return await Promise.all([
        setDbOrderBack({ side, mostRecentData, moreData }),
        handleLimitTypeOnly(),
    ]);
}

async function setDbOrderBack({ side, mostRecentData, moreData }) {
    const {
        quote,
        base,
        price, // market price
        filledFee,
        feePerc,
        type,
        timestamp,
        status: statusExchange,
    } = mostRecentData;

    const partialOrderData = await partialFilled.read();

    const isBuy = side === "BUY";

    const {
        capitalPositionPerc = 100,
        strategy,
        symbol,
        // transactionPositionPerc = 100,
    } = moreData;

    if (partialOrderData) await partialFilled.clear();
    const status = await getTransactionStatus({
        symbol,
        // transactionPerc: transactionPositionPerc,
        side,
    });

    const defaultTransaction = {
        // if no data, returns false, then undefined.
        partialOrderData: partialOrderData || undefined,
        strategy,
        type,
        timestamp: timestamp,
        transactionPositionPerc: 100,
        amounts: {
            base,
            quote,
            market: price,
        },
        fee: {
            perc: feePerc,
            amount: filledFee,
        },
    };

    const dataOrder = {
        symbol,
        statusExchange,
        status: status === "new" ? "pending" : status,
        capitalPosition: {
            totalPerc: capitalPositionPerc,
            amount: quote,
        },
        // need to be pushed since it is an array
        buyPrices: [defaultTransaction],
        sellPrices: [defaultTransaction],
    };

    const isNew = status === "new";
    if (isNew) {
        // create new document,
        if (isBuy) delete dataOrder.sellPrices;
        else delete dataOrder.buyPrices;

        const newOrder = new AmurretoOrders(dataOrder);
        await newOrder.save();
    } else {
        const dataToUpdate = {
            $set: {
                status,
                statusExchange,
            },
            ...pushFIFO(isBuy ? "buyPrices" : "sellPrices", defaultTransaction),
        };

        // LESSON: use dot notation for looking up a specific field inside an array when querying like below. "buyPrices.timestamp": 1625957134391,
        await AmurretoOrders.findOneAndUpdate(
            {
                symbol,
                status: "pending",
            },
            dataToUpdate
        );
    }

    return "done";
}
// TEST
// const moreData = {
//     symbol: "BTC/BRL",
//     strategy: "startProfit",
//     transactionPositionPerc: 100,
//     capitalPositionPerc: 100,
// };

// const mostRecentData = {
//     quote: 92.59,
//     base: 0.0003672,
//     price: 252151.42,
//     filledFee: 0.1,
//     feePerc: 0.1,
//     type: "LIMIT",
//     timestamp: 1631782453190,
//     status: "FILLED",
// };

// setDbOrderBack({ side: "SELL", mostRecentData, moreData }).then(console.log);

async function checkAlreadyExecutedStrategy(symbol, options = {}) {
    const { side } = options; // strategy
    // there will be only one pending status for
    // each asset/security so it is safe to query
    // for symbol and status pending only

    // In the most recent algo v1.15, only need verify if a SELL/BUY transaction is already taken by any strategy since we are now dealing with multiple patterns as strategy

    // last done prevension to stop equal strategies to execute can cause confusion and if selling is important and the last done is the same, we have a problem. The errors caused are not critical.
    const [dataPending] = await Promise.all([
        getDataTransaction({ symbol, side }),
        // getDataTransaction({ symbol, side, lastDone: true }),
    ]);

    // const lastStrategy = dataDone && dataDone[0] && dataDone[0].strategy;
    // const isLastDoneSameStrategy = lastStrategy === strategy;

    const finalResult = dataPending.length; // || isLastDoneSameStrategy
    return finalResult;
}

async function cancelDbOrderBack(timestamp, options = {}) {
    const { side = "SELL", symbol = "BTC/BRL" } = options;

    const targetList = side === "BUY" ? "buyPrices" : "sellPrices";

    const dataToUpdate = {
        $set: {
            status: "pending",
            statusExchange: null,
            checkPendingOrderCount: 0,
        },
        $pull: {
            [`${targetList}`]: {
                timestamp,
            },
        },
    };

    await AmurretoOrders.findOneAndUpdate(
        {
            symbol,
            [`${targetList}.timestamp`]: timestamp,
        },
        dataToUpdate
    );

    return `order ${side} with timestamp ${timestamp} was cancelled`;
}
// cancelDbOrderBack()
// .then(console.log)

// HELPERS
async function getTransactionStatus({ symbol, side }) {
    // search by symbol, timestamp and pending status so that we can check to create a new transaction or update one
    const { priorSellingPerc: doneSellPerc, isNewOrder } =
        await findTransactionSidePerc({ symbol, side });

    if (isNewOrder) return "new";

    const isSell = side === "SELL";

    const isFullSelling = isSell; // transactionPerc === 100 sometimes it is saved as 0
    const isLastPartSelling = doneSellPerc && isSell; // + transactionPerc === 100

    const isTransationDone = isFullSelling || isLastPartSelling;

    return isTransationDone ? "done" : "pending";
}

async function findTransactionSidePerc({ symbol, side }) {
    const projectQuery = {
        $project: {
            _id: 0,
            sellPrices: { $ifNull: ["$sellPrices", []] },
            buyPrices: { $ifNull: ["$buyPrices", []] },
        },
    };

    // if(!includesBuy) delete projectQuery["$project"].buyPrices;

    const ordersData = await AmurretoOrders.aggregate([
        {
            $match: {
                symbol,
                status: "pending",
            },
        },
        projectQuery,
    ]);

    const getPerc = (side = "sell") => {
        return ordersData.length
            ? ordersData[0][`${side}Prices`].reduce(
                  (acc, next) => acc + next.transactionPositionPerc,
                  0
              )
            : 0;
    };

    const checkNewOrder = () => {
        const buyPerc = getPerc("buy");
        const sellPerc = getPerc("sell");

        const isBuy = !sellPerc && side === "BUY";
        if (isBuy && !ordersData.length) return true;

        // if found a doc without buying data, need to update order instead of a new order if there is not buying data which means it was cancelled by algo
        const wasBuyingCancelledRecent = ordersData.length && buyPerc === 0;
        if (wasBuyingCancelledRecent) false;

        return false;
    };

    return {
        priorSellingPerc: getPerc("sell"),
        priorBuyingPerc: getPerc("buy"),
        isNewOrder: checkNewOrder(),
    };
}

async function getOrderTransactionPerc({ symbol, side, defaultPerc }) {
    const dataTransaction = await getDataTransaction({ symbol, side });

    const calculateTransaction = (list) => {
        const priorAccPerc = list.reduce(
            (acc, next) => acc + next.transactionPositionPerc,
            0
        );

        const leftPerc = 100 - priorAccPerc;
        return leftPerc;
    };

    return dataTransaction.length
        ? calculateTransaction(dataTransaction)
        : defaultPerc;
}

async function getDataTransaction({ symbol, side, lastDone = false }) {
    const target = side === "BUY" ? "buy" : "sell";
    const list = `${target}Prices`;

    let doneQuery = {
        $match: {},
    };
    if (lastDone) {
        doneQuery = {
            $sort: {
                updatedAt: -1,
            },
        };
    }

    const dataTransaction = await AmurretoOrders.aggregate([
        {
            $match: {
                symbol,
                status: lastDone ? "done" : "pending",
            },
        },
        {
            $project: {
                _id: 0,
                [list]: { $ifNull: [`$${list}`, []] },
                updatedAt: 1,
            },
        },
        doneQuery,
    ]);

    return dataTransaction[0] ? dataTransaction[0][list] : [];
}
// END HELPERS

module.exports = {
    checkAlreadyExecutedStrategy,
    recordFinalDbOrder,
    cancelDbOrderBack,
    getOrderTransactionPerc,
    findTransactionSidePerc,
};

/* ARCHIVES
In the most recent algo, only need verify if a SELL/BUY transaction is already taken by any strategy since we are now dealing with multiple patterns as strategy

const checkAlreadyRanStrategy = () => {
    const priorStrategies = dataTransaction.map((trans) => trans.strategy);
    return priorStrategies.includes(strategy);
};

*/
