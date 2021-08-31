const watchProfitTracker = require("./profit-tracker/profitTracker");
// strategy types
const getCandlePatternsSignal = require("./candle-patterns/getCandlePatternsSignal");
const getWatchProfitTrackerSignal = require("./profit-tracker/getProfitTrackerSignal");
// const analyseEmaSignals = require("./ema/analyseEmaSignals");
// end strategy types

// this is where all strategies we be analysed and decide when to buy and sell

const DEFAULT_WAIT_SIGNAL = {
    signal: "WAIT",
    strategy: null,
    transactionPerc: 0,
};

async function watchStrategies(options = {}) {
    const { liveCandle, candleReliability } = options;

    // watchProfitTracker is the highest priority to track pending transaction.
    const profitTracker = await watchProfitTracker();

    // this currCandleReliable is to verify if the BUY SIGNAL is reliable based on the time sidesStreak which verify how many times in every X minutes the candle was actually bullish
    // bearish candles do not apply in this version, thus returns this { status: true, reason: 'bearsDisabled' } and algo flow continues
    const isCurrCandleReliable = candleReliability.status;

    async function checkThunderingChange() {
        if (
            !isCurrCandleReliable ||
            candleReliability.reason !== "thunderingChange"
        )
            return { signal: null };
        return {
            signal: "BUY",
            strategy: "thunderingChange",
            transactionPerc: 100,
        };
    }

    // manage all strategies. changing in the order can effect the algo. So do not change unless is ultimately necessary. the top inserted here got more priority than the ones close to the bottom
    const allStrategySignals = await Promise.all([
        getWatchProfitTrackerSignal({ profitTracker }),
        checkThunderingChange(),
        getCandlePatternsSignal({ liveCandle }),
    ]);

    const finalSignal = strategiesHandler(allStrategySignals, {
        isCurrCandleReliable,
    });
    console.log("finalSignal", finalSignal);

    return finalSignal;
}

// HELPERS
function strategiesHandler(allSignals = [], options = {}) {
    const { isCurrCandleReliable } = options;

    // the first array to be looked over got more priority over the last ones
    const firstFoundValidStrategy = allSignals.find(
        (strategy) => strategy.signal === "BUY" || strategy.signal === "SELL"
    );
    if (!firstFoundValidStrategy) return DEFAULT_WAIT_SIGNAL;

    const isBuySignal = firstFoundValidStrategy.signal.toUpperCase() === "BUY";
    const isUnreliableBuySignal = isBuySignal && !isCurrCandleReliable;
    if (isUnreliableBuySignal) return DEFAULT_WAIT_SIGNAL;

    return firstFoundValidStrategy;
}
// END HELPERS

module.exports = watchStrategies;

/*
SIGNALS
BUY, SELL, WAIT, ? (unknown)
// HOLD not being using in this +v1.15

*/

/* ARCHIVES

const emaSignal = analyseEmaSignals({
    emaTrend: lastEmaTrend,
    isOverbought: null,
});

*/
