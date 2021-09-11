const novadax = require("../exchangeAPI");
const getPercentage = require("../../utils/number/perc/getPercentage");
const sortValue = require("../../utils/number/sortNumbers");
const { getConvertedPrice } = require("../helpers/convertors");
const { getTradingSymbolBack } = require("../basicInfo");
const {
    getOrderTransactionPerc,
    // findTransactionSidePerc,
    setDbOrderBack,
    cancelDbOrderBack,
    checkAlreadyExecutedStrategy,
} = require("./dbOrders");
const LiveCandleHistory = require("../../models/LiveCandleHistory");
const { TAKER_MARKET_FEE } = require("../fees");
const needCircuitBreaker = require("../helpers/circuitBreaker");
const getCurrencyAmount = require("./currencyAmounts");
const { IS_PROD, IS_DEV } = require("../../config");

async function createOrderBySignal(signalData = {}, options = {}) {
    const { signal, strategy, transactionPerc } = signalData;

    const handleSide = () => {
        // BUY and SELL sides from signal is valid. Others 2 are ignored
        if (signal === "WAIT") return null; // signal === "HOLD"
        return signal;
    };

    const side = handleSide();
    if (!side || !strategy || IS_DEV) return null;

    const {
        symbol = "BTC/BRL",
        capitalPositionPerc = 100,
        forcePrice = false,
        // type = "LIMIT",
    } = options;

    const [
        alreadyExecutedStrategyForSide,
        gotOpenOrderExchange,
        transactionPositionPerc, // 100 for 100% of money exchange or 50 for 50% of money exchange available in quote currency BRL
        isBlockedByCurcuitBreak,
        // priorSidePerc,
    ] = await Promise.all([
        checkAlreadyExecutedStrategy(symbol, { status: "pending", side }),
        checkOpeningOrderNotDoneExchange({ symbol, maxIterateCount: 5 }),
        getOrderTransactionPerc({ symbol, side, defaultPerc: transactionPerc }),
        needCircuitBreaker(),
        // findTransactionSidePerc({ symbol }),
    ]);
    // const { priorSellingPerc, priorBuyingPerc } = priorSidePerc;

    // just in case of a drastic of fall happens and an uptrend goes right straight to downtrend.
    // if got some buying position and WAIT is current sign, it is Sell sign.
    // const gotBuyPosition = priorBuyingPerc > 0;
    // const isWaitWithBuyingPosition = signal === "WAIT" && gotBuyPosition;

    // in order to use HOLD, it should be only a BUY if there is no prior SELL transaction in the current trade. That's because the robot will buy again after a SELL back to HOLD during an uptrend.
    // const isHoldWithoutPriorSell = signal === "BUY" && priorSellingPerc === 0;

    const defaultCond =
        !gotOpenOrderExchange && !alreadyExecutedStrategyForSide;
    // circuit break only apply to Buy cond because if we block sell of current transaction, the algo will be stuck and a sudden plunge in price will be ignored
    const condBuy = defaultCond && !isBlockedByCurcuitBreak && signal === "BUY"; // signal === "HOLD" || isHoldWithoutPriorSell

    if (condBuy) {
        return await createOrderBack({
            side: "BUY",
            type: "LIMIT",
            offsetPrice: 600,
            forcePrice: true, // force price for ask pricing which is the most favorable price of sellers with a offset to get a bargain under the current price
            symbol,
            strategy,
            capitalPositionPerc,
            transactionPositionPerc,
            forcePrice,
        });
    }

    const condSell = defaultCond && signal === "SELL"; // isWaitWithBuyingPosition
    if (condSell) {
        return await createOrderBack({
            side: "SELL",
            type: "MARKET",
            symbol,
            strategy,
            capitalPositionPerc,
            transactionPositionPerc,
            forcePrice,
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
        forcePrice = false, // use this before put a market price order since we set the price in a ask sellers zone so that the change to be filled is higher. But the fee can be a TAKER like market.
        // accountId, // Sub account ID, if not informed, the order will be created under master account
    } = payload;

    const isMarket = type.toUpperCase() === "MARKET";
    const isBuy = side.toUpperCase() === "BUY";

    const marketPrice = await getMarketPrice({
        isBuy,
        payload,
        symbol,
        offsetPrice,
        forcePrice,
    });

    const { baseCurrencyAmount, quoteCurrencyAmount } = await getCurrencyAmount(
        { symbol, isBuy, transactionPositionPerc }
    );

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
        // IS_PROD
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

        // after set transaction exchange, fetch that data to register in DB
        const mostRecentData = await getOrdersList({
            symbol,
            mostRecent: true,
            fallback,
        });

        const isOpenOrderInExchange =
            mostRecentData && mostRecentData.status === "PROCESSING";
        // do not record on DB as long as the order is not filled in the exchange.
        if (isOpenOrderInExchange) return null;
        await setDbOrderBack({ side, mostRecentData, moreData });
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
//     strategy: "fuck you",
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
    const orderList = await getOrdersList({ symbol, type: "open", limit: 10 });
    const lastOrder = orderList[0];

    const foundOrder = orderList.find((order) => order.timestamp === timestamp);

    if (!lastOrder || (!foundOrder && !cancelLast))
        return Promise.reject("Order is no longer available");

    const finalOrderId = cancelLast ? lastOrder.id : foundOrder.id;

    const [dataExchange] = await Promise.all([
        novadax.cancelOrder(finalOrderId),
        cancelDbOrderBack(timestamp, {
            symbol,
            side: foundOrder && foundOrder.side,
        }),
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
    } = payload;
    const fallbackPrice = !fallback.price ? 0 : Number(fallback.price);
    const fallbackQuote = !fallback.quote ? 0 : Number(fallback.quote);

    const params = {};
    let data = [];

    const treatListData = (data) => {
        const includesCancel = mostRecent;
        const neededCancel = includesCancel ? "CANCELED" : undefined;

        const list = data
            .filter(
                (order) =>
                    order.info.status === neededCancel ||
                    order.info.status === "SUBMITTED" ||
                    order.info.status === "FILLED" ||
                    order.info.status === "PROCESSING" ||
                    order.info.status === "PARTIAL_FILLED"
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

                const filledFee = isBuy
                    ? getConvertedPrice(price, {
                          base: info.filledFee,
                      })
                    : Number(info.filledFee);

                const feePerc = isMarket
                    ? TAKER_MARKET_FEE
                    : getPercentage(quote, Number(filledFee));

                return {
                    ...info,
                    timestamp,
                    // convert buy crypto fee to quote currency so that it makes simple to calculate total buy-sell fees. Sell side doesn't require because it is already in quote currency
                    price,
                    filledFee,
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
getOrdersList({ symbol: "BTC/BRL", type: "closed", limit: 2 }).then(
    console.log
);
// getOrdersList({ symbol: "BTC/BRL", mostRecent: true })
// .then(console.log)

async function checkOpeningOrderNotDoneExchange({
    symbol,
    maxIterateCount = 1,
}) {
    // verify if there is open order
    // after detect the open order, the order is cancelled and new order will be made after the algo iterate the below number of time.
    // if maxIterateCount is zero, the opening order is cancelled in the next algo iteration and attempt a new order if any buy/sell signal
    // e.g if the algo is updating every 15 minutes and maxIterateCount is equal to 1, then first makes the initial that there is open order (1 times), and then cancel the current opening order to attempt a new order
    const openOrdersList = await getOrdersList({
        symbol,
        type: "open",
        limit: 1,
    });
    let gotOpenOrder = Boolean(openOrdersList.length);

    if (gotOpenOrder) {
        const { side, timestamp } = openOrdersList[0];
        // const list = side === "BUY" ? "buyPrices" : "sellPrices";

        const LIVE_CANDLE_ID = "612b272114f951135c1938a0";
        const dataMaxIterationCount = await LiveCandleHistory.findById(
            LIVE_CANDLE_ID
        ).select("_id checkPendingOrderCount");
        const priorMaxIterationCount = !dataMaxIterationCount
            ? 0
            : dataMaxIterationCount.checkPendingOrderCount || 0;
        console.log("priorMaxIterationCount", priorMaxIterationCount);

        const incIteratorCounter = async (status) => {
            let dataToUpdate = { $inc: { checkPendingOrderCount: 1 } };
            if (!status) dataToUpdate = { checkPendingOrderCount: 0 };

            await LiveCandleHistory.findByIdAndUpdate(
                LIVE_CANDLE_ID,
                dataToUpdate
            );
        };

        const needCancelOrder = maxIterateCount === priorMaxIterationCount + 1; // since we add later the new count, add one more to cancel the order right in the number of maxIterateCount
        if (needCancelOrder) {
            await Promise.all([
                cancelOrderBack({ symbol, timestamp }),
                incIteratorCounter(false),
            ]);
            return false;
        }

        await incIteratorCounter(true);

        /*
        {
            symbol,
            [`${list}.timestamp`]: timestamp,
        },
         */
    }

    return gotOpenOrder;
}

async function getMarketPrice({
    isBuy,
    payload = {},
    symbol = "BTC/BRL",
    offsetPrice = 0, // preço deslocado
    forcePrice,
}) {
    if (payload.price) return payload.price;

    const priceInfo = await getTradingSymbolBack({ symbol });
    // quote money to invest / last price
    const lastAskPrice = Number(priceInfo.ask);
    const lastBidPrice = Number(priceInfo.bid);
    // const test = Boolean(true);
    // if buy I want a price that other buyers are willing to buy and offsetPrice is distance below this price.The same with selling
    const isNormalPrice = !forcePrice;
    const buyBid = isNormalPrice ? lastBidPrice : lastAskPrice;
    const sellAsk = isNormalPrice ? lastAskPrice : lastBidPrice;
    return isBuy ? buyBid - offsetPrice : sellAsk + offsetPrice;
}
// END HELPERS

module.exports = {
    createOrderBySignal,
    createOrderBack,
};

/* n1
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
// cancellable
PROCESSING：The order has been submitted and is in the matching queue, waiting for deal. The order is unfinished.
PARTIAL_FILLED：The order is already in the matching queue and partially traded, and is waiting for further matching and trade. The order is unfinished
FILLED：This order has been completely traded, finished and no longer in the matching queue.
//
SUBMITTED：The order has been submitted but not processed, not in the matching queue yet. The order is unfinished.
PARTIAL_CANCELED：The order has been partially traded and canceled by the user and is no longer in the matching queue. This order is finished.
PARTIAL_REJECTED：The order has been rejected by the system after being partially traded. Now it is finished and no longer in the matching queue.
CANCELED：This order has been canceled by the user before being traded. It is finished now and no longer in the matching queue.
REJECTED：This order has been rejected by the user before being traded. It is finished now and no longer in the matching queue.
CANCELING：This order is being canceled, but it is unfinished at the moment and still in the matching queue.
Order’s role(order.role)
MAKER：Brings liquidity
TAKER：Takes liquidity


ABOUT MARKET ORDER:
The exchange will close your market order for the best price available. You are not guaranteed though, that the order will be executed for the price you observe prior to placing your order. There can be a slight change of the price for the traded market while your order is being executed, also known as price slippage (derrapagme). The price can slip because of networking roundtrip latency, high loads on the exchange, price volatility and other factors. When placing a market order you don’t need to specify the price of the order.
https://ccxt.readthedocs.io/en/latest/manual.html#orders
 */
