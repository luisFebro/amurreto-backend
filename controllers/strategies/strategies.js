// strategy types
const watchProfitTracker = require("./profit-tracker/profitTracker");
const getCandlePatternsSignal = require("./candle-patterns/getCandlePatternsSignal");
// const analyseEmaSignals = require("./ema/analyseEmaSignals");
// end strategy types

// this is where all strategies we be analysed and decide when to buy and sell

// IDEA: record on DB every time an strategy is for selling to compare effectiveness
async function watchStrategies(options = {}) {
    const { liveCandle } = options;

    const profitTracker = await watchProfitTracker();
    console.log("profitTracker", profitTracker);

    // manage all strategies
    const candlePatternsSignal = getCandlePatternsSignal({ liveCandle });

    return candlePatternsSignal;
}

module.exports = watchStrategies;

/*
SIGNALS
BUY, HOLD, SELL, WAIT, ? (unknown)

*/

/* ARCHIVES

const emaSignal = analyseEmaSignals({
    emaTrend: lastEmaTrend,
    isOverbought: null,
});

*/
