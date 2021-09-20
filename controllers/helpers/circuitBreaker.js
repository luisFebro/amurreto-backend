const getLivePrice = require("../live-candle/getLivePrice");
const AmurretoOrders = require("../../models/Orders");
const { getDiffInMinutes } = require("../../utils/dates/dateFnsBack");

/*
The goal with circuit breaker in the algo is to prevent buy multiple times when there is a continuous price fluctuation going up and down right in the spot when the algo decide to buy/sell causing undesired multiple transactions with loss.

Having a circuit breaker which interrupts all operations after selling is the solution to this problem.
The algo considers both the last selling price and time so that the market can be in some other spot (bullish or bearish) which does not trigger old decisions already taken.

only applicable for buy order since if we block selling the current transaction we can have a big loss if the price bluntly drops.
 */

async function needCircuitBreaker() {
    const MIN_PRICE_DIFF = 1000;
    const MIN_TIME_AFTER_LAST_TRANS = 60; // in minute

    const livePrice = await getLivePrice("BTC/BRL");

    const lastTransactionData = await AmurretoOrders.aggregate([
        {
            $match: {
                status: "done",
            },
        },
        {
            $sort: {
                updatedAt: -1,
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
                    $first: "$list",
                },
            },
        },
    ]);

    const data = lastTransactionData[0] && lastTransactionData[0].list;
    if (!data) return false;

    const lastSellData = data.sellPrices.slice(-1)[0];
    const lastTransactionSellDate = new Date(lastSellData.timestamp);
    const lastTransactionSellMarketPrice = lastSellData.amounts.market;
    const diffPriceLastTransaction = Number(
        Math.abs(livePrice - lastTransactionSellMarketPrice).toFixed(2)
    );

    const isBlockedForPrice = diffPriceLastTransaction <= MIN_PRICE_DIFF;
    const isBlockedForTime =
        getDiffInMinutes(lastTransactionSellDate) <= MIN_TIME_AFTER_LAST_TRANS;

    const circuitBreakerData = {
        diffPriceLastTransaction,
    };

    return {
        isBlock: isBlockedForPrice || isBlockedForTime,
        circuitBreakerData,
    };
}

module.exports = needCircuitBreaker;
