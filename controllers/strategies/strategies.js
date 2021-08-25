// strategy types
const watchProfitTracker = require("./profit-tracker/profitTracker");
const analyseEmaSignals = require("./ema/analyseEmaSignals");
// const watchCandlePatterns = require("./candle-patterns/candlePatterns");
// end strategy types

// this is where all strategies we be analysed and decide when to buy and sell

// IDEA: record on DB every time an strategy is for selling to compare effectiveness
async function watchStrategies(options = {}) {
    const { lastEmaTrend } = options;

    await watchProfitTracker();

    // manage all strategies
    const emaSignal = analyseEmaSignals({
        emaTrend: lastEmaTrend,
        isOverbought: null,
    });

    return emaSignal;
}

module.exports = watchStrategies;

/*
SIGNALS
BUY, HOLD, SELL, WAIT, ? (unknown)

*/
