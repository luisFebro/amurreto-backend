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
    console.log("profitTracker", profitTracker);
    const emaUptrendStopLoss = await watchEmaUptrendStopLoss({
        liveCandle,
        profitTracker,
        dbEmaUptrend,
    });

    const isProfit = profitTracker && profitTracker.isProfit;
    const currStrategy = profitTracker && profitTracker.strategy;
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
        getCandlePatternsSignal({
            liveCandle,
            lastLiveCandle,
            lowerWing20,
        }),
        getLowerWingSignal({ lowerWing20, sequenceStreaks }),
    ]);

    const finalSignal = strategiesHandler(allStrategySignals, {
        isCurrCandleReliable,
        isProfit,
        emaUptrendStopLoss,
        sequenceStreaks,
        liveCandle,
    });
    console.log("finalSignal", finalSignal);
    return finalSignal;
}

// HELPERS
function strategiesHandler(allSignals = [], options = {}) {
    const {
        isCurrCandleReliable,
        emaUptrendStopLoss,
        liveCandle,
        // sequenceStreaks,
        // isProfit,
    } = options;
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
    // const isSellSignal = !isBuySignal;

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

// detection for bullish candle patterns adjust to catch only if size is big or huge, decreasing the changes to sell very early in a potential bullish transaction
// CHECK EXCEPTION STOPLOSS WHEN LOSS
    // allow only maxStopLoss to be triggered if no profit is made. All other selling strategies will be activated once isProfit is true.
    const exceptionStrategies = ["maxStopLoss", "threeInside", "threeOutside"]
    if (
        isSellSignal &&
        !isProfit &&
        !exceptionStrategies.includes(firstFoundValidStrategy.strategy)
    )
        return DEFAULT_WAIT_SIGNAL;
    // END CHECK EXCEPTION STOPLOSS WHEN LOSS

// CHECK STREAKS
// unhealthy bull is when there is a too long sequence and this indicates that price will go down bluntly at any time
// const MAX_HEALTH_SEQUENCE = 7;
// const isHealtyBullStreak = true;
const isLastStreakBearish =
    sequenceStreaks && sequenceStreaks.includes("B.bears");
const isStrongStreak =
    isLastStreakBearish || firstFoundValidStrategy.strategy === "soloThor";
if (isBuySignal && !isStrongStreak) return DEFAULT_WAIT_SIGNAL;
// END CHECK STREAKS
*/
