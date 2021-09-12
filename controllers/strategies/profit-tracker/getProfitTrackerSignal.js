async function getProfitTrackerSignal({ profitTracker = {}, liveCandle }) {
    const {
        watching,
        atrLimit,
        atrUpperLimit,
        // maxPerc,
        // atrLowerLimit,
    } = profitTracker;

    if (!watching || !atrLimit)
        return { signal: null, whichStrategy: "tracker" };

    const currPrice = liveCandle.close;
    const currEmaTrend = liveCandle.emaTrend;

    const hasPassedAtrUpperLimit = currPrice >= atrUpperLimit;
    const atrTrends = ["uptrend"];
    // const MAX_DIFF_SPLITTER = 0.8;

    const condAtr = !hasPassedAtrUpperLimit && atrTrends.includes(currEmaTrend);

    const whichStrategy = condAtr ? "atr" : "tracker";

    if (whichStrategy === "atr")
        return {
            whichStrategy: "atr",
            ...getAtrStrategy({ ...profitTracker, currPrice }),
        };

    return {
        whichStrategy: "tracker",
        ...getTrackerStrategy({ ...profitTracker, currEmaTrend }),
    };
}

// PROFIT STRATEGIES
// tracker is automatically activate in downtrend, bullReversal and bearReversal
function getTrackerStrategy(profitTracker) {
    const {
        maxPerc,
        isProfit,
        diffMax,
        netPerc,
        currEmaTrend,
        // minPerc,
    } = profitTracker;

    // MAX STOP LOSS
    const MAX_STOP_LOSS_PERC = -2.5;
    const maxProfitStopLoss = netPerc <= MAX_STOP_LOSS_PERC;
    if (maxProfitStopLoss) {
        return {
            signal: "SELL",
            strategy: "maxProfitStopLoss",
            transactionPerc: 100,
        };
    }
    // END MAX STOP LOSS

    // MIN AND MAX DOWNTREND PROFIT
    const allowedTrends = ["downtrend", "bullReversal", "bearReversal"];
    const primaryCond = isProfit && allowedTrends.includes(currEmaTrend);

    const minDownProfitRange = maxPerc >= 1 && maxPerc < 1.5;
    const MAX_DIFF_MINIMUM_PROFIT = 0.4;

    const isMinDowntrendProfit =
        minDownProfitRange && diffMax >= MAX_DIFF_MINIMUM_PROFIT;
    if (primaryCond && isMinDowntrendProfit) {
        return {
            signal: "SELL",
            strategy: "minDownTrendProfit",
            transactionPerc: 100,
        };
    }

    const MAX_PROFIT_DOWNTREND_PERC = 1.5;
    if (primaryCond && netPerc >= MAX_PROFIT_DOWNTREND_PERC) {
        return {
            signal: "SELL",
            strategy: "maxDowntrendProfit",
            transactionPerc: 100,
        };
    }
    // END MIN AND MAX DOWNTREND PROFIT
    const handleZones = () => {
        const highBearReversalZoneA = maxPerc >= 0 && maxPerc < 0.5;
        const highBearReversalZoneB = maxPerc >= 1 && maxPerc < 1.2;
        if (highBearReversalZoneA) return 0.5;
        if (highBearReversalZoneB) return 0.3;

        return 1.5;
    };

    const MAX_DIFF_START_PROFIT = handleZones();
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

// automatically activate in an uptrend
function getAtrStrategy(profitTracker) {
    const {
        atrLowerLimit,
        currPrice,
        netPerc,
        maxPerc,
        // atrLimit,
    } = profitTracker;
    const minRangeForSellNetPerc = maxPerc >= 1.5;
    const condMinimizeLoss = minRangeForSellNetPerc && netPerc <= -1;

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
 }

 */
