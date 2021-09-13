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
    } = options;

    // watchProfitTracker is the highest priority to track pending transaction.
    const profitTracker = await watchProfitTracker({ liveCandle });

    // this currCandleReliable is to verify if the BUY SIGNAL is reliable based on the time sidesStreak which verify how many times in every X minutes the candle was actually bullish
    const isCurrCandleReliable = candleReliability.status;

    // manage all strategies. changing in the order can effect the algo. So do not change unless is ultimately necessary. the top inserted here got more priority than the ones close to the bottom
    const allStrategySignals = await Promise.all([
        getProfitTrackerSignal({ profitTracker, liveCandle }),
        getCandlePatternsSignal({
            liveCandle,
            lastLiveCandle,
            lowerWing20,
        }),
        getLowerWingSignal({ lowerWing20, sequenceStreaks }),
    ]);

    const profitStrategy = allStrategySignals[0].whichStrategy;
    console.log("profitStrategy", profitStrategy);

    const essentialData = {
        signal: "BUY",
        strategy: "teste 30",
        transactionPerc: 100,
    };
    // const essentialData = strategiesHandler(allStrategySignals, {
    //     isCurrCandleReliable,
    //     sequenceStreaks,
    //     liveCandle,
    //     profitTracker,
    //     profitStrategy,
    // });

    // TYPE ORDER HANDLING
    const currCandleSize = liveCandle.candleBodySize;
    const needLimitType = true; //checkCondLimitOrder({
    //     signal: essentialData && essentialData.signal,
    //     currCandleSize,
    // });

    const orderType = needLimitType ? "LIMIT" : "MARKET";
    const offsetPrice = needLimitType ? 500 : 0;
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
        isCurrCandleReliable,
        liveCandle = {},
        profitTracker,
        profitStrategy,
        // sequenceStreaks,
        // isProfit,
    } = options;

    const signalStrategy = (profitTracker && profitTracker.strategy) || null;
    const currATR = liveCandle && liveCandle.atr;
    const disableATR = liveCandle && liveCandle.atrLimits.disableATR;
    console.log("signalStrategy", signalStrategy);
    console.log("currATR", currATR);

    // the first array to be looked over got more priority over the last ones
    const firstFoundValidStrategy = allSignals.find(
        (strategy) => strategy.signal === "BUY" || strategy.signal === "SELL"
    );

    if (!firstFoundValidStrategy) return DEFAULT_WAIT_SIGNAL;
    const foundStrategy = firstFoundValidStrategy.strategy;

    const isBuySignal = firstFoundValidStrategy.signal.toUpperCase() === "BUY";
    // const isSellSignal = !isBuySignal;

    // only allow profit related stoploss because if allow candle patterns it will be trigger like bearish three inside/outside

    const onlyProfitStopLoss =
        firstFoundValidStrategy.strategy.includes("Profit");

    // CHECK PROFIT STRATEGY
    const isAtrStrategy = profitStrategy === "atr";
    if (!onlyProfitStopLoss && isAtrStrategy) return DEFAULT_WAIT_SIGNAL;
    // END CHECK PROFIT STRATAGY

    // CHECK FREE FALL (only exception to buy in a bear market)
    const isFreeFall = signalStrategy === "freeFall";
    // deny because volatility is high and probability favors losses since it is an downtrend.
    const denyBuySignal = !isFreeFall && disableATR;
    if (denyBuySignal) return DEFAULT_WAIT_SIGNAL;

    if (!onlyProfitStopLoss && isFreeFall) return DEFAULT_WAIT_SIGNAL;
    // END CHECK FREE FALL

    const isUnreliableBuySignal = handleUnreliableBuySignal({
        isBuy: isBuySignal,
        foundStrategy,
        isCurrReliable: isCurrCandleReliable,
    });

    if (isUnreliableBuySignal) return DEFAULT_WAIT_SIGNAL;

    return firstFoundValidStrategy;
}

function handleUnreliableBuySignal({ isBuy, foundStrategy, isCurrReliable }) {
    const exceptionToReliability = ["freeFall", "thunderingChange"];
    if (exceptionToReliability.includes(foundStrategy)) return false;

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

// CHECK EMA UPTREND STOPLOSS
    if (turnOtherStrategiesOff) {
        if (!sellSignal) return DEFAULT_WAIT_SIGNAL;
        return sellSignal;
    }
    // END CHECK EMA UPTREND STOPLOSS
*/
