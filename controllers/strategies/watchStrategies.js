const watchProfitTracker = require("./profit-tracker/profitTracker");
// strategy types
const getCandlePatternsSignal = require("./candle-patterns/getCandlePatternsSignal");
const getProfitTrackerSignal = require("./profit-tracker/getProfitTrackerSignal");
const getLowerWingSignal = require("./lower-wing/getLowerWingSignal");
const { checkCondLimitOrder } = require("../fees");
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
        isContTrend,
    } = options;

    // watchProfitTracker is the highest priority to track pending transaction.
    const profitTracker = await watchProfitTracker({ liveCandle });
    console.log("profitTracker", profitTracker);

    // manage all strategies. changing in the order can effect the algo. So do not change unless is ultimately necessary. the top inserted here got more priority than the ones close to the bottom
    const allStrategySignals = await Promise.all([
        getProfitTrackerSignal({ profitTracker, liveCandle, isContTrend }),
        getCandlePatternsSignal({
            liveCandle,
            lastLiveCandle,
            lowerWing20,
        }),
        // getLowerWingSignal({ lowerWing20, sequenceStreaks }),
    ]);

    const profitStrategy = allStrategySignals[0].whichStrategy;
    console.log("profitStrategy", profitStrategy);

    const essentialData = strategiesHandler(allStrategySignals, {
        candleReliability,
        sequenceStreaks,
        liveCandle,
        profitTracker,
        profitStrategy,
    });

    // TYPE ORDER HANDLING
    const currCandleSize = liveCandle.candleBodySize;
    const needLimitType = checkCondLimitOrder({
        signal: essentialData && essentialData.signal,
        currCandleSize,
    });

    const orderType = needLimitType ? "LIMIT" : "MARKET";
    const offsetPrice = needLimitType ? 300 : 0;
    const forcePrice = needLimitType;
    // END TYPE ORDER HANDLING

    const finalSignal = {
        ...essentialData,
        offsetPrice, // some difference from the current market price.
        forcePrice, // force price for ask pricing which is the most favorable price of sellers with a offset to get a bargain under the current price
        type: orderType,
    };

    console.log("finalSignal", finalSignal);
    return finalSignal;
}

// HELPERS
function strategiesHandler(allSignals = [], options = {}) {
    const {
        candleReliability,
        liveCandle = {},
        profitTracker,
        profitStrategy,
        // sequenceStreaks,
        // isProfit,
    } = options;

    const signalStrategy = (profitTracker && profitTracker.strategy) || null;
    const disableATR = liveCandle && liveCandle.atrLimits.disableATR;

    // the first array to be looked over got more priority over the last ones
    const firstFoundValidStrategy = allSignals.find(
        (strategy) => strategy.signal === "BUY" || strategy.signal === "SELL"
    );

    if (!firstFoundValidStrategy) return DEFAULT_WAIT_SIGNAL;
    const foundStrategy = firstFoundValidStrategy.strategy;

    const isBuySignal = firstFoundValidStrategy.signal.toUpperCase() === "BUY";
    const isSellSignal = !isBuySignal;

    // only allow profit related stoploss because if allow candle patterns it will be trigger like bearish three inside/outside
    const isProfitLimitSignal =
        firstFoundValidStrategy.strategy.includes("Profit");

    // CHECK PROFIT STRATEGY - the strategy changes according to EMA automatically
    const isAtrStrategy = profitStrategy === "atr";
    const exceptionAtrPatterns = foundStrategy === "candleEater";

    const allowedSignals =
        isBuySignal ||
        (isSellSignal && isProfitLimitSignal) ||
        exceptionAtrPatterns;
    if (isAtrStrategy && !allowedSignals) return DEFAULT_WAIT_SIGNAL;
    // END CHECK PROFIT STRATAGY

    // CHECK FREE FALL (only exception to buy in a bear market)
    const isFreeFall = signalStrategy === "freeFall";
    // deny because volatility is high and probability favors losses since it is an downtrend.
    const denyBuySignal = !isFreeFall && disableATR;
    if (denyBuySignal) return DEFAULT_WAIT_SIGNAL;

    const isBlockMaxProfitSignal = foundStrategy === "maxDowntrendProfit";
    if (isFreeFall && (!isProfitLimitSignal || isBlockMaxProfitSignal))
        return DEFAULT_WAIT_SIGNAL;
    // END CHECK FREE FALL

    const isUnreliableBuySignal = handleUnreliableBuySignal({
        isBuySignal,
        foundStrategy,
        isProfitLimitSignal,
        candleReliability,
        liveCandle,
    });

    if (isUnreliableBuySignal) return DEFAULT_WAIT_SIGNAL;

    return firstFoundValidStrategy;
}

function handleUnreliableBuySignal({
    foundStrategy,
    isProfitLimitSignal,
    isBuySignal,
    candleReliability,
    liveCandle,
}) {
    // this currCandleReliable is to verify if the BUY/SELL SIGNAL is reliable based on the time sidesStreak which verify how many times in every 10 minutes the candle was actually bullish/bearish
    const isCurrReliable = candleReliability.status;
    const reliableReason = candleReliability.reason;

    const exceptionToReliability = [
        "freeFall",
        "thunderingChange",
        "atrProfitStopLoss",
        "patternTWEEZERS",
    ];
    const isPatternException = exceptionToReliability.includes(foundStrategy);
    if (isProfitLimitSignal || isPatternException) return false;

    if (isBuySignal && reliableReason === "40minBearishReliable") return true;

    const candleBodySize = liveCandle.candleBodySize;
    const allowCandleSizes = ["medium", "big"];
    if (isBuySignal && allowCandleSizes.includes(candleBodySize)) return false;

    return !isCurrReliable;
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

// CHECK EMA UPTREND STOPLOSS
    if (turnOtherStrategiesOff) {
        if (!sellSignal) return DEFAULT_WAIT_SIGNAL;
        return sellSignal;
    }
    // END CHECK EMA UPTREND STOPLOSS
*/

/* TESTE

const essentialData = {
    signal: "SELL",
    strategy: "teste 50",
    transactionPerc: 100,
};

*/
