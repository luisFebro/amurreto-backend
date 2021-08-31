const watchProfitTracker = require("./profit-tracker/profitTracker");
// strategy types
const getCandlePatternsSignal = require("./candle-patterns/getCandlePatternsSignal");
const getWatchProfitTracker = require("./profit-tracker/getProfitTrackerSignal");
// const analyseEmaSignals = require("./ema/analyseEmaSignals");
// end strategy types

// this is where all strategies we be analysed and decide when to buy and sell

// IDEA: record on DB every time an strategy is for selling to compare effectiveness
async function watchStrategies(options = {}) {
    const { liveCandle, candleReliability } = options;
    const checkCandleReliability =
        candleReliability && candleReliability.status;

    // watchProfitTracker is the highest priority to track pending transaction.
    const profitTracker = await watchProfitTracker();

    console.log("candleReliability", candleReliability);
    // if (!checkCandleReliability)
    //     return {
    //         signal: "WAIT",
    //         strategy: null,
    //         transactionPerc: 100,
    //     };

    async function checkThunderingChange() {
        if (
            !checkCandleReliability ||
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
        getWatchProfitTracker({ profitTracker }),
        checkThunderingChange(),
        getCandlePatternsSignal({ liveCandle }),
    ]);

    const finalSignal = strategiesManager(allStrategySignals, {
        candleReliability,
    });
    console.log("finalSignal", finalSignal);

    return finalSignal;
}

// HELPERS
function strategiesManager(allSignals = []) {
    // the first array to be looked over got more priority over the last ones
    const firstFoundValidStrategy = allSignals.find(
        (strategy) => strategy.signal === "BUY" || strategy.signal === "SELL"
    );

    if (!firstFoundValidStrategy) {
        return {
            signal: "WAIT",
            strategy: null,
            transactionPerc: 0,
        };
    }

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
