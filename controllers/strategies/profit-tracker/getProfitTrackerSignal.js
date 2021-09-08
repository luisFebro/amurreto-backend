async function getProfitTrackerSignal({ profitTracker = {}, liveCandle }) {
    const {
        watching,
        maxPerc,
        atrLimit,
        atrUpperLimit,
        // atrLowerLimit,
    } = profitTracker;

    if (!watching || !atrLimit)
        return { signal: null, whichStrategy: "tracker" };

    const currPrice = liveCandle.close;
    const currEmaTrend = liveCandle.emaTrend;

    const hasPassedAtrUpperLimit = currPrice >= atrUpperLimit;
    const atrTrends = ["bullReversal", "bull"];
    const MAX_DIFF_SPLITTER = 0.8;
    const condAtr =
        !hasPassedAtrUpperLimit &&
        (maxPerc >= MAX_DIFF_SPLITTER || atrTrends.includes(currEmaTrend));

    const whichStrategy = condAtr ? "atr" : "tracker";

    if (whichStrategy === "atr")
        return {
            whichStrategy: "atr",
            ...getAtrStrategy({ ...profitTracker, currPrice }),
        };

    return {
        whichStrategy: "tracker",
        ...getTrackerStrategy(profitTracker),
    };
}

// PROFIT STRATEGIES
function getTrackerStrategy(profitTracker) {
    const {
        maxPerc,
        isProfit,
        diffVolat,
        diffMax,
        // netPerc,
        // minPerc,
    } = profitTracker;

    const MAX_DIFF_VOLAT_PERC = 2.5; // diff between maxPerc and minPerc from profit
    // FACTS
    // 2% is about -3.000 in price including 0.60% buy/sell fees.
    // 0.4 of profit is the minimum to breakeven, thus not earning or losing anything.

    const maxProfitStopLoss = !isProfit && diffVolat >= MAX_DIFF_VOLAT_PERC;
    if (maxProfitStopLoss) {
        return {
            signal: "SELL",
            strategy: "maxProfitStopLoss",
            transactionPerc: 100,
        };
    }

    const MAX_DIFF_START_PROFIT = 1.5;
    const MAX_DIFF_MID_PROFIT = 1;
    const MAX_DIFF_LONG_PROFIT = 0.5;
    // using maxPerc instead of netPerc so that it can be not change when price went back down and keep profit.
    const startProfitRange = maxPerc >= 0 && maxPerc < 0.8;
    const midProfitRange = maxPerc >= 0.8 && maxPerc < 4;
    const longProfitRange = maxPerc >= 4;

    const isStartProfit =
        startProfitRange && diffMax >= MAX_DIFF_START_PROFIT && "startProfit";
    const isMidProfit =
        midProfitRange && diffMax >= MAX_DIFF_MID_PROFIT && "midProfit";
    const isLongProfit =
        longProfitRange && diffMax >= MAX_DIFF_LONG_PROFIT && "longProfit";
    const profitRange = isStartProfit || isMidProfit || isLongProfit;

    if (isProfit && profitRange) {
        return {
            signal: "SELL",
            strategy: profitRange,
            transactionPerc: 100,
        };
    }

    // empty signal handle with strategiesManager
    return { signal: null };
}

function getAtrStrategy(profitTracker) {
    const {
        atrLowerLimit,
        currPrice,
        netPerc,
        maxPerc,
        // atrLimit,
    } = profitTracker;
    const minRangeForSellNetPerc = maxPerc >= 1.5;
    const condMinimizeLoss = minRangeForSellNetPerc && netPerc <= 0;

    const atrSellCond = condMinimizeLoss || currPrice <= atrLowerLimit;

    if (atrSellCond) {
        return {
            signal: "SELL",
            strategy: "atrProfitStopLoss",
            transactionPerc: 100,
        };
    }

    // empty signal handle with strategiesManager
    return { signal: null };
}
// END PROFIT STRATEGIES

module.exports = getProfitTrackerSignal;

/*

{ watching: true,
  transactionId: 612e08b73f7d6a0016259c5d,
  isProfit: false,
  maxPerc: 0.29,
  netPerc: -2.02,
  minPerc: -2.03,
  diffMax: 2.31,
  diffVolat: 2.32 }

 */
