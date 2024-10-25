const getLivePrice = require("../live-candle/getLivePrice");
const AmurretoOrders = require("../../models/Orders");
const { getDiffInMinutes } = require("../../utils/dates/dateFnsBack");
const getLastProfitStatus = require("../strategies/profit-tracker/getLastProfitStatus");

/*
The goal with circuit breaker in the algo is to prevent buy multiple times when there is a continuous price fluctuation going up and down right in the spot when the algo decide to buy/sell causing undesired multiple transactions with loss.

Having a circuit breaker which interrupts all operations after selling is the solution to this problem.
The algo considers both the last selling price and time so that the market can be in some other spot (bullish or bearish) which does not trigger old decisions already taken.

only applicable for buy order since if we block selling the current transaction we can have a big loss if the price bluntly drops.
 */

async function needCircuitBreaker({ emaTrend }) {
    const [livePrice, lastProfitRow] = await Promise.all([
        getLivePrice("BTC/BRL"),
        getLastProfitStatus(),
    ]);

    // for trading with higher volatility, the gap is lower for circuit breaker to get best deals in the dip
    const MIN_PRICE_DIFF = emaTrend === "downtrend" ? 1000 : 2000;
    const MIN_TIME_AFTER_LAST_TRANS = handleBreakerTimer({
        lastProfitRow,
        emaTrend,
    }); // in minute

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
    if (!data)
        return {
            isBlock: false,
            circuitBreakerData: {},
            lastProfitRow: [],
        };

    const lastSellData = data.sellPrices.slice(-1)[0];
    const lastTransactionSellDate = new Date(lastSellData.timestamp);
    const lastTransactionSellMarketPrice = lastSellData.amounts.market;
    const diffPriceLastTransaction = Number(
        Math.abs(livePrice - lastTransactionSellMarketPrice).toFixed(2)
    );

    const isBlockedForPrice = diffPriceLastTransaction <= MIN_PRICE_DIFF;
    const isBlockedForTime =
        getDiffInMinutes(lastTransactionSellDate) <= MIN_TIME_AFTER_LAST_TRANS;

    const timeLeft =
        MIN_TIME_AFTER_LAST_TRANS - getDiffInMinutes(lastTransactionSellDate);
    const circuitBreakerData = {
        diffPriceLastTransaction,
        diffMinutesLastTransaction: getDiffInMinutes(lastTransactionSellDate),
        diffPrice: diffPriceLastTransaction,
        timeLeft: timeLeft > 0 ? timeLeft : 0,
        totalDuration: MIN_TIME_AFTER_LAST_TRANS,
    };

    return {
        isBlock: isBlockedForPrice || isBlockedForTime,
        circuitBreakerData,
        lastProfitRow,
    };
}

module.exports = needCircuitBreaker;

// HELPERS
function handleBreakerTimer({ lastProfitRow, emaTrend }) {
    const timerByLoss = checkProfitCountAndBreaker(lastProfitRow);
    if (timerByLoss) return timerByLoss;

    return emaTrend === "downtrend" ? 30 : 60; // in minute
}

function checkProfitCountAndBreaker(lastProfitRow = []) {
    if (!lastProfitRow.length) return null;

    let profitCount = 0;
    lastProfitRow.forEach((b) => {
        if (b === true) profitCount += 1;
    });

    // if the last two are profitable, then the timer is not defined here
    // if the last two are losses, then the circuit breaker span is bigger.
    if (profitCount === 2) return null;
    if (profitCount === 1) return 360; // 6 hours
    if (profitCount === 0) return 720; // 12 hours

    return null;
}

// END HELPERS
