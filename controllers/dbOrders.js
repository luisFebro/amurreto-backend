const AmurretoOrders = require("../models/Orders");
const getPercentage = require("../utils/number/perc/getPercentage");
const { getConvertedPrice } = require("./helpers/convertors");
const { pushFIFO } = require("../utils/mongodb/fifo");

async function verifyLastStrategy(symbol, options = {}) {
    const { side, strategy } = options;
    // there will be only one pending status for
    // each asset/security so it is safe to query
    // for symbol and status pending only
    const dataTransaction = await getDataTransaction({ symbol, side });

    const checkAlreadyRanStrategy = (list) => {
        const priorStrategies = list.map((trans) => trans.strategy);
        return priorStrategies.includes(strategy);
    };

    return dataTransaction.length
        ? checkAlreadyRanStrategy(dataTransaction)
        : false;
}

async function setDbOrderBack({ side, exchangeRes, moreData }) {
    if (!exchangeRes) return null;

    const {
        price,
        averagePrice,
        filledAmount,
        filledFee,
        type,
        timestamp,
        value,
        status: statusExchange,
    } = exchangeRes;

    const isBuy = side === "BUY";

    const {
        capitalPositionPerc,
        strategy,
        transactionPositionPerc,
        symbol,
        TAKER_MARKET_FEE,
    } = moreData;

    const status = await getTransactionStatus({
        symbol,
        transactionPerc: transactionPositionPerc,
        side,
    });

    const amountFee = isBuy // buy fee is in the base currency in cases of crypto market: BTC, ETH, etc
        ? getConvertedPrice(price, {
              base: filledFee,
          })
        : Number(filledFee);

    const capital = Number(value);

    const defaultTransaction = {
        strategy,
        type,
        timestamp: timestamp,
        transactionPositionPerc,
        amounts: {
            base: Number(filledAmount),
            quote: capital,
            market: Number(averagePrice),
        },
        fee: {
            perc:
                price === "0"
                    ? TAKER_MARKET_FEE
                    : Number(getPercentage(value, amountFee)),
            amount: amountFee,
        },
    };

    const dataOrder = {
        symbol,
        statusExchange,
        status: status === "new" ? "pending" : status,
        capitalPosition: {
            totalPerc: capitalPositionPerc,
            amount: getPercentage(capital, capitalPositionPerc, {
                mode: "value",
            }),
        },
        // need to be pushed since it is an array
        buyPrices: [defaultTransaction],
        sellPrices: [defaultTransaction],
    };

    const isNew = status === "new";
    if (isNew) {
        // if status is "done" or "new", create new document,
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
async function getTransactionStatus({ symbol, transactionPerc, side }) {
    // search by symbol, timestamp and pending status so that we can check to create a new transaction or update one
    const doneSellPerc = await findTransactionSellPerc({ symbol });
    if (!doneSellPerc && side === "BUY") return "new";

    const isSell = side === "SELL";

    const isFullSelling = transactionPerc === 100 && isSell;
    const isLastPartSelling = doneSellPerc + transactionPerc === 100 && isSell;

    const isTransationDone = isFullSelling || isLastPartSelling;

    return isTransationDone ? "done" : "pending";
}

async function findTransactionSellPerc({ symbol, includesBuy = false }) {
    const projectQuery = {
        $project: {
            _id: 0,
            sellPrices: { $ifNull: ["$sellPrices", []] },
            buyPrices: { $ifNull: ["$buyPrices", []] },
        },
    };

    if(!includesBuy) delete projectQuery["$project"].buyPrices;

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
    }

    if(includesBuy) {
        return {
            priorSellingPerc: getPerc("sell"),
            priorBuyingPerc:  getPerc("buy"),
        }
    }

    return getPerc("sell");
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

async function getDataTransaction({ symbol, side }) {
    const target = side === "BUY" ? "buy" : "sell";
    const list = `${target}Prices`;

    const dataTransaction = await AmurretoOrders.aggregate([
        {
            $match: {
                symbol,
                status: "pending",
            },
        },
        {
            $project: {
                _id: 0,
                [list]: { $ifNull: [`$${list}`, []] },
            },
        },
    ]);

    return dataTransaction[0] ? dataTransaction[0][list] : [];
}
// END HELPERS

module.exports = {
    verifyLastStrategy,
    setDbOrderBack,
    cancelDbOrderBack,
    getOrderTransactionPerc,
    findTransactionSellPerc,
};
