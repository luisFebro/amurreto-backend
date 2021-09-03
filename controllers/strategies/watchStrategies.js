const watchProfitTracker = require("./profit-tracker/profitTracker");
const watchEmaUptrendStopLoss = require("./ema/watchEmaUptrendStopLoss");
// strategy types
const getCandlePatternsSignal = require("./candle-patterns/getCandlePatternsSignal");
const getProfitTrackerSignal = require("./profit-tracker/getProfitTrackerSignal");
const getLowerWingSignal = require("./lower-wing/getLowerWingSignal");
// const analyseEmaSignals = require("./ema/analyseEmaSignals");
// end strategy types

// this is where all strategies we be analysed and decide when to buy and sell

const DEFAULT_WAIT_SIGNAL = {
    signal: "WAIT",
    strategy: null,
    transactionPerc: 0,
};

async function watchStrategies(options = {}) {
    const {
        liveCandle,
        lastLiveCandle,
        candleReliability,
        lowerWing20,
        sequenceStreaks,
        dbEmaUptrend,
    } = options;

    // watchProfitTracker is the highest priority to track pending transaction.
    const profitTracker = await watchProfitTracker();
    const emaUptrendStopLoss = await watchEmaUptrendStopLoss({
        liveCandle,
        profitTracker,
        dbEmaUptrend,
    });

    const isProfit = profitTracker && profitTracker.isProfit;
    // this currCandleReliable is to verify if the BUY SIGNAL is reliable based on the time sidesStreak which verify how many times in every X minutes the candle was actually bullish
    const isCurrCandleReliable = candleReliability.status;

    async function checkThunderingChange() {
        if (candleReliability.reason !== "thunderingChange")
            return { signal: null };
        return {
            signal: "BUY",
            strategy: "thunderingChange",
            transactionPerc: 100,
        };
    }

    // manage all strategies. changing in the order can effect the algo. So do not change unless is ultimately necessary. the top inserted here got more priority than the ones close to the bottom
    const allStrategySignals = await Promise.all([
        getProfitTrackerSignal({ profitTracker, lastLiveCandle }),
        checkThunderingChange(),
        getCandlePatternsSignal({ liveCandle, lastLiveCandle }),
        getLowerWingSignal({ lowerWing20, sequenceStreaks }),
    ]);

    const finalSignal = strategiesHandler(allStrategySignals, {
        isCurrCandleReliable,
        isProfit,
        emaUptrendStopLoss,
    });
    console.log("finalSignal", finalSignal);
    return finalSignal;
}

// HELPERS
function strategiesHandler(allSignals = [], options = {}) {
    const { isCurrCandleReliable, isProfit, emaUptrendStopLoss } = options;
    const { turnOtherStrategiesOff, sellSignal } = emaUptrendStopLoss;

    // CHECK EMA UPTREND STOPLOSS
    if (turnOtherStrategiesOff) {
        if (!sellSignal) return DEFAULT_WAIT_SIGNAL;
        return sellSignal;
    }
    // END CHECK EMA UPTREND STOPLOSS

    // the first array to be looked over got more priority over the last ones
    const firstFoundValidStrategy = allSignals.find(
        (strategy) => strategy.signal === "BUY" || strategy.signal === "SELL"
    );
    if (!firstFoundValidStrategy) return DEFAULT_WAIT_SIGNAL;

    const isBuySignal = firstFoundValidStrategy.signal.toUpperCase() === "BUY";
    const isSellSignal = !isBuySignal;

    // allow only maxStopLoss to be triggered if no profit is made. All other selling strategies will be activated once isProfit is true.
    if (
        isSellSignal &&
        !isProfit &&
        firstFoundValidStrategy.strategy !== "maxStopLoss"
    )
        return DEFAULT_WAIT_SIGNAL;

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
