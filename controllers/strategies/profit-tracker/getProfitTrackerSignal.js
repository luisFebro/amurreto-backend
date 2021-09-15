async function getProfitTrackerSignal({
    profitTracker = {},
    liveCandle,
    isContTrend,
}) {
    const {
        watching,
        atrLimit,
        atrUpperLimit,
        maxCurrPrice,
        maxPerc,
        // atrLowerLimit,
    } = profitTracker;
    if (!watching || !atrLimit)
        return { signal: null, whichStrategy: "tracker" };

    const contTrendSignal = getContTrendStrategy({
        profitTracker,
        isContTrend,
    });
    if (contTrendSignal) return contTrendSignal;

    const livePrice = liveCandle.close;
    const currEmaTrend = liveCandle.emaTrend;

    const hasPassedAtrUpperLimit = maxCurrPrice >= atrUpperLimit;
    const atrTrends = ["uptrend"];
    // const MAX_DIFF_SPLITTER = 0.8;

    const condAtr =
        maxPerc >= 0.5 &&
        !hasPassedAtrUpperLimit &&
        atrTrends.includes(currEmaTrend);

    const whichStrategy = condAtr ? "atr" : "tracker";

    if (whichStrategy === "atr")
        return {
            whichStrategy: "atr",
            ...getAtrStrategy({ ...profitTracker, livePrice }),
        };

    return {
        whichStrategy: "tracker",
        ...getTrackerStrategy({
            ...profitTracker,
            currEmaTrend,
            hasPassedAtrUpperLimit,
            liveCandle,
        }),
    };
}

// PROFIT STRATEGIES
function getContTrendStrategy({ profitTracker, isContTrend }) {
    if (!isContTrend) return false;

    const { maxPerc, netPerc } = profitTracker;

    const nextProfitGoalPerc = Math.round(maxPerc);
    const isGoSignal = netPerc >= nextProfitGoalPerc && nextProfitGoalPerc >= 1;
    if (!isGoSignal) return false;

    return {
        whichStrategy: "contTrend",
        signal: "SELL",
        strategy: `contTrendLevel${nextProfitGoalPerc}`,
        transactionPerc: 100,
    };
}

// tracker is automatically activate in downtrend, bullReversal and bearReversal
function getTrackerStrategy(data) {
    const {
        maxPerc,
        isProfit,
        diffMax,
        netPerc,
        currEmaTrend,
        // minPerc,
        hasPassedAtrUpperLimit,
        liveCandle,
    } = data;

    const nextLevel = hasPassedAtrUpperLimit ? "AfterAtr" : "";

    // MAX STOP LOSS
    const MAX_STOP_LOSS_PERC = -2;
    const maxProfitStopLoss = netPerc <= MAX_STOP_LOSS_PERC;
    if (maxProfitStopLoss) {
        return {
            signal: "SELL",
            strategy: `maxProfitStopLoss${nextLevel}`,
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
            strategy: `minDownTrendProfit${nextLevel}`,
            transactionPerc: 100,
        };
    }

    const MAX_PROFIT_DOWNTREND_PERC = 1.5;
    const candleBodySize = liveCandle.candleBodySize;
    const largeSizes = ["big", "huge"];
    const includesLargeSizes = largeSizes.includes(candleBodySize);
    if (
        primaryCond &&
        netPerc >= MAX_PROFIT_DOWNTREND_PERC &&
        !includesLargeSizes
    ) {
        return {
            signal: "SELL",
            strategy: "maxDowntrendProfit",
            transactionPerc: 100,
        };
    }
    // END MIN AND MAX DOWNTREND PROFIT
    const handleMaxDiffZones = () => {
        const highBearReversalZoneA = maxPerc >= 0 && maxPerc < 0.5;
        const highBearReversalZoneB = maxPerc >= 1 && maxPerc < 1.2;
        if (highBearReversalZoneA) return 0.5;
        if (highBearReversalZoneB) return 0.3;

        return 1.5;
    };

    const MAX_DIFF_START_PROFIT = handleMaxDiffZones();
    const MAX_DIFF_MID_PROFIT = 1;
    const MAX_DIFF_LONG_PROFIT = 0.5;
    // using maxPerc instead of netPerc so that it can be not change when price went back down and keep profit.
    const startProfitRange = maxPerc >= 0 && maxPerc < 1.5;
    const midProfitRange = maxPerc >= 1.5 && maxPerc < 4;
    const longProfitRange = maxPerc >= 4;

    const isStartProfit =
        startProfitRange &&
        diffMax >= MAX_DIFF_START_PROFIT &&
        `startProfit${nextLevel}`;
    const isMidProfit =
        midProfitRange &&
        diffMax >= MAX_DIFF_MID_PROFIT &&
        `midProfit${nextLevel}`;
    const isLongProfit =
        longProfitRange &&
        diffMax >= MAX_DIFF_LONG_PROFIT &&
        `longProfit${nextLevel}`;
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
function getAtrStrategy(data) {
    const {
        atrLowerLimit,
        livePrice,
        maxPerc,
        // netPerc,
        // atrLimit,
    } = data;
    const minRangeForSellNetPerc = maxPerc >= 2.5;
    const atrSellCond = minRangeForSellNetPerc || livePrice <= atrLowerLimit;

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
