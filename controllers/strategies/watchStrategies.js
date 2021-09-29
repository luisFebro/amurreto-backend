const watchProfitTracker = require("./profit-tracker/profitTracker");
// strategy types
const getCandlePatternsSignal = require("./candle-patterns/getCandlePatternsSignal");
const getProfitTrackerSignal = require("./profit-tracker/getProfitTrackerSignal");
const getEmaSignal = require("./ema/getEmaSignal");
const { checkCondLimitOrder } = require("../fees");
const { getOrdersList } = require("../orders/orders");

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
        lowerWing,
        higherWing,
        stoplossGrandCandle,
        sequenceStreaks,
        isContTrend,
    } = options;

    // watchProfitTracker is the highest priority to track pending transaction.
    const profitTracker = await watchProfitTracker({ liveCandle });
    console.log("profitTracker", profitTracker);
    const signalStrategy = (profitTracker && profitTracker.strategy) || null;

    // manage all strategies. changing in the order can effect the algo. So do not change unless is ultimately necessary. the top inserted here got more priority than the ones close to the bottom
    const allStrategySignals = await Promise.all([
        getEmaSignal({
            currStrategy: signalStrategy,
            liveCandle,
            profitTracker,
        }),
        getProfitTrackerSignal({
            profitTracker,
            liveCandle,
            higherWing,
            lastLiveCandle,
            stoplossGrandCandle,
            isContTrend,
        }),
        getCandlePatternsSignal({
            liveCandle,
            lastLiveCandle,
        }),
    ]);

    const profitStrategy = allStrategySignals[1].whichStrategy;
    console.log("profitStrategy", profitStrategy);

    const essentialData = strategiesHandler(allStrategySignals, {
        candleReliability,
        sequenceStreaks,
        liveCandle,
        profitTracker,
        profitStrategy,
        signalStrategy,
        lowerWing,
    });

    // TYPE ORDER HANDLING
    const currCandleSize = liveCandle.candleBodySize;

    const dataLastOrder = await getOrdersList({
        symbol: "BTC/BRL",
        mostRecent: true,
    });
    // for buy the exchange will not allow small values and does not require a cond in the first place, but to avoid set LIMIT to values below R$ 100 because the algo will not be able to sell if less than R$25.
    const isEnoughMoneyForSelling =
        dataLastOrder &&
        dataLastOrder.side === "BUY" &&
        Number(dataLastOrder.filledValue) >= 100;
    const needLimitType = checkCondLimitOrder({
        signal: essentialData && essentialData.signal,
        currCandleSize,
        isEnoughMoneyForSelling,
    });

    const orderType = needLimitType ? "LIMIT" : "MARKET";
    const offsetPrice = needLimitType ? 100 : 0;
    // // END TYPE ORDER HANDLING

    const finalSignal = {
        ...essentialData,
        offsetPrice, // some difference from the current market price.
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
        signalStrategy,
        lowerWing,
    } = options;
    const candleBodySize = liveCandle && liveCandle.candleBodySize;
    const candleSide = liveCandle && liveCandle.isBullish ? "bull" : "bear";
    const disableATR = liveCandle && liveCandle.atrLimits.disableATR;
    const maxProfit = profitTracker && profitTracker.maxPerc;
    const netProfit = profitTracker && profitTracker.netPerc;
    // the first array to be looked over got more priority over the last ones
    const firstFoundValidStrategy = allSignals.find(
        (strategy) => strategy.signal === "BUY" || strategy.signal === "SELL"
    );

    console.log("firstFoundValidStrategy", firstFoundValidStrategy);
    if (!firstFoundValidStrategy) return DEFAULT_WAIT_SIGNAL;
    const foundStrategy = firstFoundValidStrategy.strategy;

    const isBuySignal = firstFoundValidStrategy.signal.toUpperCase() === "BUY";
    const isSellSignal = !isBuySignal;

    // SELL - DOWNTREND MIN PROFIT AND COND ..
    const MIN_PROFIT_NET_PERC = 0.4;
    const isMinProfit = maxProfit >= MIN_PROFIT_NET_PERC;
    const isExceptionSellSignal = [
        "maxProfitStopLoss",
        "startProfitNextLevel",
        "midProfitNextLevel",
        "longProfitNextLevel",
        "maxProfitHigherWing",
        "emaDowntrend",
    ].includes(foundStrategy);
    // need have some profit to allow take profit with bearish candles and only allow maxStoploss if no profit
    const isAcceptSellCond =
        (candleSide === "bear" && (isMinProfit || isExceptionSellSignal)) ||
        (candleSide === "bull" && candleBodySize === "huge");
    if (isSellSignal && !isAcceptSellCond) return DEFAULT_WAIT_SIGNAL;

    // only sell a curr emaUptrend strategy matches a emaDowntrend selling signal
    if (
        isSellSignal &&
        signalStrategy === "emaUptrend" &&
        foundStrategy !== "emaDowntrend"
    )
        return DEFAULT_WAIT_SIGNAL;
    //  END SELL - DOWNTREND MIN PROFIT AND COND

    // only allow profit related stoploss because if allow candle patterns it will be trigger like bearish three inside/outside
    const isProfitLimitSignal =
        firstFoundValidStrategy.strategy.includes("Profit");

    // BUY - ZONE VERIFICATION FOR ENTRY
    // allow all candles to be buyable only the price drops for a better change of profit. Otherwise, the algo will want to buy when price is higher with high change of bearish reversal
    const oversoldZone = lowerWing.diffCurrPrice;
    const BUY_ZONE_LIMIT = 2500; // 2500
    const allowBuySignalsByZone = oversoldZone <= BUY_ZONE_LIMIT;
    const isExceptionBuySignal = ["emaUptrend", "freeFall"].includes(
        foundStrategy
    );
    if (isBuySignal && !allowBuySignalsByZone && !isExceptionBuySignal)
        return DEFAULT_WAIT_SIGNAL;
    // BUY - END ZONE VERIFICATION FOR ENTRY

    // CHECK PROFIT STRATEGY - the strategy changes according to EMA automatically
    const isUptrendStrategy = profitStrategy === "atr";
    const exceptionUptrendPatterns = ["emaDowntrend", "emaUptrend"].includes(
        foundStrategy
    );

    const allowedSignals =
        isBuySignal ||
        (isSellSignal && isProfitLimitSignal) ||
        exceptionUptrendPatterns;
    if (isUptrendStrategy && !allowedSignals) return DEFAULT_WAIT_SIGNAL;
    // END CHECK PROFIT STRATAGY

    // CHECK FREE FALL (only exception to buy in a bear market)
    const isFreeFall = signalStrategy === "freeFall";
    // deny because volatility is high and probability favors losses since it is an downtrend.
    const denyBuySignalDisableAtr = !isFreeFall && disableATR;
    if (denyBuySignalDisableAtr) return DEFAULT_WAIT_SIGNAL;

    // if freeFall, then disable candle patterns and max profit takers so that we can take as much we can from this trade.
    // allow only profit strategy with enough profit already taken
    const isEnoughProfitForFreefall = maxProfit >= 4;
    const reachedMaxStopLossForFreefall = foundStrategy === "maxProfitStopLoss";

    if (isFreeFall && netProfit <= -2) {
        return {
            signal: "SELL",
            strategy: "maxStopLossFreeFall",
            transactionPerc: 100,
        };
    }

    if (
        isFreeFall &&
        !reachedMaxStopLossForFreefall &&
        (!isProfitLimitSignal || !isEnoughProfitForFreefall)
    )
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
    // liveCandle,
}) {
    // this currCandleReliable is to verify if the BUY/SELL SIGNAL is reliable based on the time sidesStreak which verify how many times in every 10 minutes the candle was actually bullish/bearish
    const isCurrReliable = candleReliability.status;
    const reliableReason = candleReliability.reason;

    const exceptionToReliability = ["atrProfitStopLoss", "freeFall"];
    const isPatternException = exceptionToReliability.includes(foundStrategy);
    if (isProfitLimitSignal || isPatternException) return false;

    if (isBuySignal && reliableReason === "40minBearishReliable") return true;

    return !isCurrReliable;
}
// END HELPERS

module.exports = watchStrategies;

/*
SIGNALS
BUY, SELL, WAIT, ? (unknown)
// HOLD not being using in this +v1.15

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
    strategy: "teste",
    transactionPerc: 100,
};

*/
