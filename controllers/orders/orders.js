const novadax = require("../exchangeAPI");
const sortValue = require("../../utils/number/sortNumbers");
const {
    getOrderTransactionPerc,
    // findTransactionSidePerc,
    // MARKET TYPE RECORD
    recordFinalDbOrder,
    cancelDbOrderBack,
    checkAlreadyExecutedStrategy,
} = require("./dbOrders");
const LiveCandleHistory = require("../../models/LiveCandleHistory");
const { getTransactionFees } = require("../fees");
const getCurrencyAmount = require("./currencyAmounts");
const { IS_PROD, IS_DEV } = require("../../config");
const partialFilled = require("./partialFilled");
const getId = require("../../utils/getId");
const analyseMarketPrice = require("./marketPrice");

const LIVE_CANDLE_ID = "613ed80dd3ce8cd2bbce76cb";
const validOpenOrderStatus = [
    "SUBMITTED",
    "PROCESSING",
    "PARTIAL_FILLED",
    "FILLED",
];

async function createOrderBySignal(signalData = {}, options = {}) {
    const {
        symbol = "BTC/BRL",
        type = "MARKET",
        signal,
        strategy,
        transactionPerc = 100,
        capitalPositionPerc = 100,
        offsetPrice = 0,
    } = signalData;

    const { isCircuitBreakerBlock } = options;

    const handleSide = () => {
        // BUY and SELL sides from signal is valid. Others 2 are ignored
        if (signal === "WAIT") return null; // signal === "HOLD"
        return signal;
    };

    const side = handleSide();

    // essential check to register pending open transaction with LIMIT order type.
    const openOrderExchange = await checkOpeningOrderNotDoneExchange({
        symbol,
        side,
        orderType: type,
        maxIterateCount: 5, // 2.5 min for 30s each iteration.
        strategy,
    });

    const {
        gotOpenOrderExchange,
        needRecordOnly,
        dbSignal,
        dbStrategy,
        dbAttempts,
    } = openOrderExchange;

    // note that, after registration, the count and signal are set to 0 and null respectively.
    const needRecordLimitBuyOnly = needRecordOnly && dbSignal === "BUY";
    const needRecordLimitSellOnly = needRecordOnly && dbSignal === "SELL";

    // dbStrategy is the fallback value when the signal is available only for a few seconds and it is null the next algo reading.
    const thisStrategy = strategy || dbStrategy;

    const validSide = side || needRecordOnly;
    const validStrategy = thisStrategy || needRecordOnly;

    if (!validSide || !validStrategy || IS_DEV) return null;

    const [
        alreadyExecutedStrategyForSide,
        transactionPositionPerc, // 100 for 100% of money exchange or 50 for 50% of money exchange available in quote currency BRL
        // priorSidePerc,
    ] = await Promise.all([
        checkAlreadyExecutedStrategy(symbol, {
            status: "pending",
            side,
            strategy: thisStrategy,
        }),
        getOrderTransactionPerc({ symbol, side, defaultPerc: transactionPerc }),
        // findTransactionSidePerc({ symbol }),
    ]);

    const defaultCond =
        !gotOpenOrderExchange && !alreadyExecutedStrategyForSide;
    // circuit break only apply to Buy cond because if we block sell of current transaction, the algo will be stuck and a sudden plunge in price will be ignored
    const condBuy =
        needRecordLimitBuyOnly ||
        (defaultCond && !isCircuitBreakerBlock && signal === "BUY"); // signal === "HOLD" || isHoldWithoutPriorSell

    if (condBuy) {
        return await createOrderBack({
            side: "BUY",
            type, // order type LIMIT or MARKET
            symbol,
            strategy: thisStrategy,
            capitalPositionPerc,
            transactionPositionPerc,
            offsetPrice,
            transactionAttempts: dbAttempts,
            needOnlyRecordLimitOrderDB: needRecordLimitBuyOnly,
        });
    }

    const condSell =
        needRecordLimitSellOnly || (defaultCond && signal === "SELL"); // isWaitWithBuyingPosition

    if (condSell) {
        return await createOrderBack({
            side: "SELL",
            type,
            symbol,
            strategy: thisStrategy,
            capitalPositionPerc,
            transactionPositionPerc,
            offsetPrice,
            needOnlyRecordLimitOrderDB: needRecordLimitSellOnly,
            transactionAttempts: dbAttempts,
        });
    }

    // handle risk and return with ATR or last candle lowest.
    return null;
}

// INSIGHT: for stoploss in market price,
// we can create an algo which check the current order, if not executed, try again after a X value like every 500 after the stop-loss not triggered
// the stop-loss should be identified priorly according to the entry price. Then, after reach this point, runa limit order to be executated.
// LESSON:
// do not put a limit order as a stop-loss for SELLING without a trigger because it will be triggered
// exception is for buying in the lowest price.
async function createOrderBack(payload = {}) {
    const {
        symbol = "BTC/BRL", // The trading symbol to trade, like BTC/BRL
        strategy, // for DB, identify the type of strategy the bot triggered and avoid repetiation from that already executed one
        type = "LIMIT", // The type of order, single option: LIMIT, MARKET, STOP_LIMIT, STOP_MARKET (the two last not working)
        side = "BUY", // The direction of order, single option: SELL, BUY - When you place a buy order you give quote currency and receive base currency. For example, buying BTC/USD means that you will receive bitcoins for your dollars. When you are selling BTC/USD the outcome is the opposite and you receive dollars for your bitcoins.
        capitalPositionPerc = 100, // for db, devide the available amount in the exchange account to the assets. like 50% for BTC and 50% for ETH
        transactionPositionPerc = 100, // transaction position percentage from total position
        offsetPrice = 0,
        needOnlyRecordLimitOrderDB, // record only a limit order after exchange has filled
        transactionAttempts,
        // accountId, // Sub account ID, if not informed, the order will be created under master account
    } = payload;

    const isMarket = type.toUpperCase() === "MARKET";
    const isBuy = side.toUpperCase() === "BUY";
    const isSell = !isBuy;

    const marketPrice = await analyseMarketPrice({
        isBuy,
        payload,
        symbol,
        // selling is most crutial to have a as near as possible to ask price so that we can take the desired triggered profit. Otherwise, if the first attempt fail and the price continue to drop we lose part of it
        offsetPrice: isSell || transactionAttempts >= 2 ? offsetPrice : 0,
        forcePrice: isSell || transactionAttempts >= 2 ? true : false,
    });

    const { baseCurrencyAmount, quoteCurrencyAmount } = await getCurrencyAmount(
        { symbol, isBuy, transactionPositionPerc }
    );

    // prevent transactions that are triggered but not enough balance
    const MIN_BASE_BALANCE = 0.00001;
    const MIN_QUOTE_BALANCE = 25;
    const notEnoughBalance =
        (isSell && baseCurrencyAmount < MIN_BASE_BALANCE) ||
        (isBuy && quoteCurrencyAmount < MIN_QUOTE_BALANCE);
    if (notEnoughBalance && !needOnlyRecordLimitOrderDB) return null;

    const params = {
        value: isMarket && isBuy ? quoteCurrencyAmount : undefined,
        // 'clientOrderId': orderId,
        // stopPrice: "180000", error ExchangeError: novadax {"code":"A99999","data":null,"message":"Operation failed."}
        // type: isStopPrice ? "stopLimit" : undefined,
    };

    const orderPrice = isMarket ? "0" : marketPrice;

    const moreData = {
        symbol,
        strategy,
        transactionPositionPerc,
        capitalPositionPerc,
    };

    // data either open or closed for LIMIT AND MARKET orders
    const fallback = {
        quote: quoteCurrencyAmount,
        price: marketPrice,
    };

    // REGISTRATION DB AND EXCHANGE
    if (IS_PROD) {
        const isLimit = type === "LIMIT";
        // after set transaction exchange, fetch that data to register in DB
        // in case of limit order, the transaction need only be registered in the DB because previously already was filled
        const lastRecentData = await getOrdersList({
            symbol,
            mostRecent: true,
            fallback,
        });

        if (needOnlyRecordLimitOrderDB) {
            // LIMIT/MARKET ORDER REGISTER
            return await recordFinalDbOrder({
                needLimitTypeOnly: true,
                side,
                mostRecentData: lastRecentData,
                moreData,
            });
        }

        // need cancel any pending order if suddently change from Limit to Market Order
        const suddenChangeFromLimitToMarket =
            !isLimit &&
            lastRecentData &&
            lastRecentData.status === "PROCESSING";
        if (suddenChangeFromLimitToMarket) {
            await cancelOrderBack({ symbol, cancelLast: true });
        }

        await novadax
            .createOrder(
                symbol,
                type,
                side,
                baseCurrencyAmount,
                orderPrice,
                params
            )
            .catch((response) => {
                const error = response.toString();
                console.log("error", error);
                if (error.includes("A30007"))
                    Promise.reject("Insufficient balance");
                if (error.includes("A30004"))
                    Promise.reject("Value is too small");
                if (error.includes("A30002"))
                    Promise.reject(
                        "Balance not enough or order amount is too small"
                    );
            });

        const mostRecentData = await getOrdersList({
            symbol,
            mostRecent: true,
            fallback,
        }).catch(() => {
            cancelOrderBack({ symbol, cancelLast: true });
        });

        // LATEST OPEN ORDER ID
        // IMPORTANT: make sure register open order data right away in case of pending order takes less than a minute and before the id can be set on DB to record the data properly
        if (isLimit && mostRecentData) {
            const newFoundOpenOrderId = `${mostRecentData.quote}||${mostRecentData.base}`;
            const dataToUpdate = {
                "pendingLimitOrder.signal": side,
                "pendingLimitOrder.strategy": strategy,
                "pendingLimitOrder.openOrderId": newFoundOpenOrderId,
            };

            const validStatus = validOpenOrderStatus.includes(
                mostRecentData.status
            );
            if (validStatus)
                await LiveCandleHistory.findByIdAndUpdate(
                    LIVE_CANDLE_ID,
                    dataToUpdate
                );

            return null;
        }
        // END LATEST OPEN ORDER ID

        // MARKET TYPE RECORD
        await recordFinalDbOrder({ side, mostRecentData, moreData });
    }
    // END REGISTRATION DB AND EXCHANGE

    return null;
}
// createOrderBack({
//     side: "BUY",
//     type: "LIMIT",
//     offsetPrice: 600,
//     forcePrice: true,
//     symbol: "BTC/BRL",
//     strategy: "",
//     capitalPositionPerc: 100,
//     transactionPositionPerc: 100,
// })
// .then(console.log)

/*
 This endpoint only submits the cancel request, the actual result of the cancel request needs to be checked by `Get Order Details` endpoint.
 */
async function cancelOrderBack(payload = {}) {
    const cancelLast = (payload.cancelLast || true) && !payload.timestamp;
    const { timestamp, symbol } = payload;
    const orderList = await getOrdersList({
        symbol,
        type: "open",
        limit: 10,
        includesPartials: true,
    });
    const lastOrder = orderList[0];

    const foundOrder = orderList.find((order) => order.timestamp === timestamp);

    if (!lastOrder || (!foundOrder && !cancelLast))
        return Promise.reject("Order is no longer available");

    const finalOrderId = cancelLast ? lastOrder.id : foundOrder.id;

    const handleDbOrderCancel = async () => {
        if (!timestamp) return null;

        return await cancelDbOrderBack(timestamp, {
            symbol,
            side: foundOrder && foundOrder.side,
        });
    };

    const [dataExchange] = await Promise.all([
        novadax.cancelOrder(finalOrderId),
        handleDbOrderCancel(),
    ]);

    return dataExchange.info; // returns { result: true }
}
// cancelOrderBack({ symbol: "BTC/BRL", cancelLast: true })
// .then(console.log)

async function getOrdersList(payload = {}) {
    const {
        type = "open", // or closed
        symbol = undefined, // "BRZ/BRL" if undefined includes all symbols;
        since = undefined,
        limit = 10,
        mostRecent = false, // get either open or close order right after order request
        fallback = {}, // // fallback is used as the last value in case of the exchange did not process the order. need to register the value in DB.
        removeCancel = false,
        includesPartials = false,
    } = payload;
    const fallbackPrice = !fallback.price ? 0 : Number(fallback.price);
    const fallbackQuote = !fallback.quote ? 0 : Number(fallback.quote);

    const params = {};
    let data = [];

    const treatListData = (data) => {
        const includesCancel = mostRecent && !removeCancel;
        const neededCancel = includesCancel ? "CANCELED" : undefined;
        const neededPartialCancel = includesPartials
            ? "PARTIAL_CANCELED"
            : undefined;
        const neededPartialFilled = includesPartials
            ? "PARTIAL_FILLED"
            : undefined;

        const list = data
            .filter(
                (order) =>
                    order.info.status === neededCancel ||
                    order.info.status === neededPartialCancel ||
                    order.info.status === neededPartialFilled ||
                    order.info.status === "SUBMITTED" ||
                    order.info.status === "FILLED" ||
                    order.info.status === "PROCESSING"
            )
            .map((each) => {
                const info = each.info;
                const timestamp = Number(info.timestamp);
                const isBuy = info.side === "BUY";
                const isMarket = info.type === "MARKET";

                // market price
                const price =
                    Number(info.averagePrice) ||
                    Number(info.price) ||
                    fallbackPrice;
                const base = Number(info.filledAmount) || Number(info.amount); // just to handle LIMIT order which is null for filled Data
                const quote =
                    Number(info.filledValue) ||
                    Number(info.value) ||
                    fallbackQuote;

                const { feeAmount, feePerc } = getTransactionFees({
                    isBuy,
                    isMarket,
                    marketPrice: price,
                    quotePrice: quote,
                    filledFee: info.filledFee,
                });

                return {
                    ...info,
                    timestamp,
                    // convert buy crypto fee to quote currency so that it makes simple to calculate total buy-sell fees. Sell side doesn't require because it is already in quote currency
                    price,
                    filledFee: feeAmount,
                    feePerc,
                    quote,
                    base,
                };
            });

        return sortValue(list, { target: "timestamp" });
    };

    if (mostRecent) {
        const thisLimit = 1;
        const thisSince = undefined;
        const [open, closed] = await Promise.all([
            novadax.fetchOpenOrders(symbol, thisSince, thisLimit),
            novadax.fetchClosedOrders(symbol, thisSince, thisLimit),
        ]);

        // return object if mostRecent
        if (open.length) return treatListData(open)[0];
        return treatListData(closed)[0];
    }

    if (type === "open") {
        data = await novadax.fetchOpenOrders(symbol, since, limit, params);
    } else {
        data = await novadax.fetchClosedOrders(symbol, since, limit, params);
    }

    return treatListData(data);
}
// getOrdersList({
//     symbol: "BTC/BRL",
//     type: "closed",
//     limit: 4,
//     includesPartials: true,
// }).then(console.log);
// getOrdersList({ symbol: "BTC/BRL", mostRecent: true })
// .then(console.log)

// HELPERS

const handlePartialFilledOrders = async ({ partialData, strategy }) => {
    if (!partialData.length) return null;

    const partialFilledOrder = partialData[0];
    const basePrice = Number(partialFilledOrder.base);
    const quotePrice = Number(partialFilledOrder.quote.toFixed(2));
    const marketPrice = Number(partialFilledOrder.price);
    const feeAmount = partialFilledOrder.filledFee;
    const feePerc = partialFilledOrder.feePerc;
    const timestamp = partialFilledOrder.timestamp;

    await partialFilled.clear();
    const bdData = await partialFilled.read();

    const lastHistory = bdData.history || [];
    const currHistory = {
        id: getId(),
        timestamp,
        strategy,
        amounts: {
            market: marketPrice,
            quote: quotePrice,
            base: basePrice,
        },
        fee: {
            perc: feePerc,
            amount: feeAmount,
        },
    };

    await partialFilled.update({
        lastHistory,
        currHistory,
    });

    return true;
};

async function checkOpeningOrderNotDoneExchange({
    symbol,
    maxIterateCount = 1,
    side,
    orderType,
    strategy,
}) {
    // verify if there is open order
    // after detect the open order, the order is cancelled and new order will be made after the algo iterate the below number of time.
    // if maxIterateCount is zero, the opening order is cancelled in the next algo iteration and attempt a new order if any buy/sell signal
    // e.g if the algo is updating every 15 minutes and maxIterateCount is equal to 1, then first makes the initial that there is open order (1 times), and then cancel the current opening order to attempt a new order
    const [openOrdersList, closeOrdersList] = await Promise.all([
        getOrdersList({
            symbol,
            type: "open",
            removeCancel: true,
            includesPartials: true,
            limit: 1,
        }),
        getOrdersList({
            symbol,
            type: "closed",
            removeCancel: true,
            limit: 1,
        }),
    ]);

    // after no open order is available, the next algo reading will have the most recent side BUY or SELL.
    // In the method incIteratorCounter, we use the opposite because when there is no open order, the signals are no longer recorded in DB and it will be read the last closed order which is the opposite.
    const lastClosedSide = closeOrdersList[0] && closeOrdersList[0].side;

    let gotOpenOrderExchange = Boolean(openOrdersList.length);

    const incIteratorCounter = async (status, options = {}) => {
        const { incAttempts } = options;

        // strategy and signal are now recorded right after sending order to exchange
        let dataToUpdate = {
            $inc: { "pendingLimitOrder.count": 1 },
            // "pendingLimitOrder.openOrderId": openOrderId,
            // ...signalInclusion,
        };

        if (!status) {
            const insertAttempts = !incAttempts
                ? {}
                : { $inc: { "pendingLimitOrder.attempts": 1 } };

            dataToUpdate = {
                "pendingLimitOrder.count": 0,
                ...insertAttempts,
                // signal is only set to null in recordFinalDbOrder to avoid issues with not recorded transaction. The needRecord param will do well
                // "pendingLimitOrder.signal": null,
            };
        }

        await LiveCandleHistory.findByIdAndUpdate(LIVE_CANDLE_ID, dataToUpdate);
    };

    // clean up count when WAIT (!side) and no pending orders so that algo can record the right order
    const detectedCleanableSide = !side && !gotOpenOrderExchange;
    if (detectedCleanableSide) await incIteratorCounter(false);

    const [dbData, dataCurrency] = await Promise.all([
        LiveCandleHistory.findById(LIVE_CANDLE_ID).select(
            "-_id pendingLimitOrder"
        ),
        getCurrencyAmount({
            symbol,
            isBuy: lastClosedSide === "BUY",
            transactionPositionPerc: 100,
        }),
    ]);

    const dbMaxIterationCount = dbData ? dbData.pendingLimitOrder.count : 0;
    const dbSignal = dbData ? dbData.pendingLimitOrder.signal : null;
    const dbAttempts = dbData ? dbData.pendingLimitOrder.attempts : 0;
    const dbStrategy = dbData ? dbData.pendingLimitOrder.strategy : null;
    const dbOpenOrderId = dbData ? dbData.pendingLimitOrder.openOrderId : null;

    const lastOpenOrderId =
        openOrdersList[0] &&
        `${openOrdersList[0].quote}||${openOrdersList[0].base}`;
    const lastCloseOrderId =
        closeOrdersList[0] &&
        `${closeOrdersList[0].quote}||${closeOrdersList[0].base}`;

    const matchOrderIds = dbOpenOrderId === lastCloseOrderId;

    const openOrderStatus = openOrdersList[0] && openOrdersList[0].status;
    const isPartialFilled = openOrderStatus === "PARTIAL_FILLED";

    // const { quoteCurrencyAmount } = dataCurrency;
    // console.log("dataCurrency FUCK", dataCurrency);
    // const recentBoughtButNotRecorded =
    //     dbOpenOrderId &&
    //     lastClosedSide === "BUY" &&
    //     quoteCurrencyAmount <= 25 &&
    //     !matchOrderIds &&
    //     !gotOpenOrderExchange &&
    //     !isPartialFilled;

    const needRecordOnly = Boolean(
        !gotOpenOrderExchange && dbOpenOrderId && matchOrderIds // recentBoughtButNotRecorded
    );

    // need to refuse if no pending order in exchange
    const refuseToContinue =
        !gotOpenOrderExchange ||
        (!gotOpenOrderExchange && orderType === "MARKET");
    if (refuseToContinue)
        return {
            gotOpenOrderExchange,
            needRecordOnly, // ignore pendingTypeLimit check if market so that it ain't gonna count in the DB.
            dbSignal,
            dbStrategy,
            dbAttempts,
        };

    if (gotOpenOrderExchange) {
        const needCancelOrder =
            lastOpenOrderId && maxIterateCount <= dbMaxIterationCount + 1; // since we add later the new count, add one more to cancel the order right in the number of maxIterateCount
        if (needCancelOrder) {
            // needCancelOrder
            if (isPartialFilled)
                await handlePartialFilledOrders({
                    partialData: openOrdersList,
                    strategy,
                });
            await Promise.all([
                cancelOrderBack({ symbol, cancelLast: true }),
                incIteratorCounter(false, { incAttempts: true }),
            ]);
            return false;
        }

        const validStatus = validOpenOrderStatus.includes(openOrderStatus);
        if (validStatus) await incIteratorCounter(true);
    }

    return {
        gotOpenOrderExchange,
        // if there is a number of dbMaxIterationCount, it means the current open limit order was executed by the exchange and need to be recorded in the DB properly.
        // the dbMaxIterationCount should be zero again after db registration of the LIMIT transaction.
        needRecordOnly,
        dbSignal, // identify which side to execute either BUY or SELL
        dbStrategy,
        dbAttempts,
    };
}
// END HELPERS

module.exports = {
    createOrderBySignal,
    createOrderBack,
};

/* n1
Price x AveragePrice
- Price or marketPrice is the intended and set price in the exchange. In the case of the market does not need to specify it, just in case of LIMIT.
- AveragePrice is the actual filled price and it can be slightly different from the intended market price. In case of LIMIT ORDER, if you are selling, the average Price will always be the best price - the highest price, if buying, the lowest price than the market price.

ABOUT MARKET ORDER:
The exchange will close your market order for the best price available. You are not guaranteed though, that the order will be executed for the price you observe prior to placing your order. There can be a slight change of the price for the traded market while your order is being executed, also known as price slippage (derrapagme). The price can slip because of networking roundtrip latency, high loads on the exchange, price volatility and other factors. When placing a market order you don’t need to specify the price of the order.
https://ccxt.readthedocs.io/en/latest/manual.html#orders

real example:
{ amount: '0.00025349',
  averagePrice: null,
  filledAmount: '0',
  filledFee: '0',
  filledValue: '0',
  id: '860923546913927168',
  price: '179000',
  side: 'SELL',
  status: 'PROCESSING',
  symbol: 'BTC_BRL',
  timestamp: '1625301768772',
  type: 'LIMIT',
  value: '45.37',
}

{
    "code": "A10000",
    "data": {
        "amount": "0.001", // The amount of base currency
        "averagePrice": null,
        "filledAmount": "0", // The executed amount of base currency
        "filledFee": "0", // Transaction fee paid
        "filledValue": "0", // The executed amount of quote currency
        "id": "633680805433102336",
        "price": "35000",
        "side": "SELL",
        "status": "PROCESSING", // The status of order, can be found in order introduction
        "symbol": "BTC_BRL",
        "timestamp": 1571122877244,
        "type": "LIMIT",
        "value": "35" // The amount of quote currency
    },
    "message": "Success"
}
The quote currency (counter currency) is the SECOND CURRENCY in both a direct and indirect currency pair and is used to value the base currency. Currency quotes show many units of the quote currency they will need to exchange for one unit of the first (base) currency.

Order status(order.status)
parcialmente executado (PARTIAL_FILLED) x parcialmente cancelado (PARTIAL_CANCELED)
- partial_filled is always in the OPEN ORDERS whiel partial_canceled is found in closed order as result.
- when there is PARTIAL_FILLED and if you cancel it, then we have a PARTIAL_CANCELED transaction with what partially was traded.
SUBMITTED：The order has been submitted but not processed, not in the matching queue yet. The order is unfinished.
PROCESSING：The order has been submitted and is in the matching queue, waiting for deal. The order is unfinished.
FILLED：This order has been completely traded, finished and no longer in the matching queue.
PARTIAL_FILLED：The order is already in the matching queue and partially traded, and is waiting for further matching and trade. The order is unfinished
PARTIAL_CANCELED：The order has been partially traded and canceled by the user and is no longer in the matching queue. This order is finished.
PARTIAL_REJECTED：The order has been rejected by the system after being partially traded. Now it is finished and no longer in the matching queue.
CANCELED：This order has been canceled by the user before being traded. It is finished now and no longer in the matching queue.
REJECTED：This order has been rejected by the user before being traded. It is finished now and no longer in the matching queue.
CANCELING：This order is being canceled, but it is unfinished at the moment and still in the matching queue.
Order’s role(order.role)
MAKER：Brings liquidity
TAKER：Takes liquidity
 */

/* ARCHIVES
const recentSoldButNotRecorded =
dbOpenOrderId &&
lastClosedSide === "SELL" &&
baseCurrencyAmount <= 0.00001 &&
!matchOrderIds &&
!gotOpenOrderExchange &&
!isPartialFilled;

const signalInclusion =
!lastClosedSide || !strategy
    ? {}
    : {
          "pendingLimitOrder.signal":
              lastClosedSide === "BUY" ? "SELL" : "BUY",
          "pendingLimitOrder.strategy": strategy,
      };

*/
