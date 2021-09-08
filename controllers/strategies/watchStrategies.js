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

    // const isProfit = profitTracker && profitTracker.isProfit;
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
        emaUptrendStopLoss,
        sequenceStreaks,
        liveCandle,
        profitTracker,
    });
    console.log("finalSignal", finalSignal);
    return finalSignal;
}

// HELPERS
function strategiesHandler(allSignals = [], options = {}) {
    const {
        isCurrCandleReliable,
        emaUptrendStopLoss,
        profitTracker,
        liveCandle,
        // sequenceStreaks,
        // isProfit,
    } = options;
    const { turnOtherStrategiesOff, sellSignal } = emaUptrendStopLoss;

    const currStrategy = (profitTracker && profitTracker.strategy) || null;
    const currATR = liveCandle && liveCandle.atr;
    console.log("currStrategy", currStrategy);
    console.log("currATR", currATR);

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

    // CHECK FREE FALL
    const isFreeFall = currStrategy === "freeFall";
    // deny because volatility is high and probability favors losses since it is an downtrend.
    const denyBuySignal = !isFreeFall && currATR >= 3000;
    if (denyBuySignal) return DEFAULT_WAIT_SIGNAL;

    if (isFreeFall) {
        // only allow profit related stoploss because if allow candle patterns it will be trigger like bearish three inside/outside
        const includeOnlyProfitStopLoss =
            firstFoundValidStrategy.strategy.includes("Profit");
        if (!includeOnlyProfitStopLoss) return DEFAULT_WAIT_SIGNAL;
    }
    // END CHECK FREE FALL

    const isUnreliableBuySignal = handleUnreliableBuySignal({
        isBuy: isBuySignal,
        foundStrategy: firstFoundValidStrategy,
        isCurrReliable: isCurrCandleReliable,
    });
    if (isUnreliableBuySignal) return DEFAULT_WAIT_SIGNAL;

    return firstFoundValidStrategy;
}

function handleUnreliableBuySignal({ isBuy, foundStrategy, isCurrReliable }) {
    if (foundStrategy === "freeFall") return false;
    return isBuy && !isCurrReliable;
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
