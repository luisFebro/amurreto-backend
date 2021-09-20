const MAX_STOP_LOSS_PERC = 2.5;

async function getProfitTrackerSignal({
    profitTracker = {},
    liveCandle,
    lastLiveCandle,
    isContTrend,
}) {
    const {
        watching,
        isProfit,
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
        maxPerc >= 1 &&
        isProfit &&
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
            lastLiveCandle,
            currEmaTrend,
            hasPassedAtrUpperLimit,
            liveCandle,
        }),
    };
}

// PROFIT STRATEGIES
function getContTrendStrategy({ profitTracker, isContTrend }) {
    if (!isContTrend) return false;
    const DOWN_RANGE_DIFF = 0.2;

    const { maxPerc, netPerc } = profitTracker;

    const nextProfitGoalPerc = Math.round(maxPerc);
    const limitDown = nextProfitGoalPerc - DOWN_RANGE_DIFF;
    const finalRange = limitDown <= netPerc || netPerc >= nextProfitGoalPerc;
    const isGoSignal = finalRange && nextProfitGoalPerc >= 1;
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
        diffMax,
        netPerc,
        // minPerc,
        hasPassedAtrUpperLimit,
        liveCandle,
        lastLiveCandle,
    } = data;
    // const isBullish = liveCandle.isBullish;

    const nextLevel = hasPassedAtrUpperLimit ? "AfterAtr" : "";

    // MAX STOP LOSS
    const maxProfitStopLoss = netPerc <= Number(`-${MAX_STOP_LOSS_PERC}`);
    if (maxProfitStopLoss) {
        return {
            signal: "SELL",
            strategy: "maxProfitStopLoss",
            transactionPerc: 100,
        };
    }
    // END MAX STOP LOSS

    const handleMaxDiffZones = () => {
        // the minimum profit is 0.5 to trigger a sell signal.
        const highBearReversalZoneA = maxPerc >= 0.5 && maxPerc < 8;
        const highBearReversalZoneB = maxPerc >= 0.8 && maxPerc < 1.2;
        if (highBearReversalZoneA) return 0.2;
        if (highBearReversalZoneB) return 0.3;

        return 0.5;
    };

    const MAX_DIFF_START_PROFIT = handleMaxDiffZones();
    const MAX_DIFF_MID_PROFIT = 1;
    const MAX_DIFF_LONG_PROFIT = 0.5;
    // using maxPerc instead of netPerc so that it can be not change when price went back down and keep profit.
    const startProfitRange = maxPerc >= 0 && maxPerc < 1.5;
    const midProfitRange = maxPerc >= 1.5 && maxPerc < 4;
    const longProfitRange = maxPerc >= 4;

    // EXCEPTIONS FOR START PROFIT
    const MAX_PERC_EXCEP = 0.5;
    // resistence
    // exception resistence when there is a bearish candle, but not reached the bottom (lowest) of the last candle with potential to a sudden reversal to upside.
    const exceptionResistence =
        maxPerc <= MAX_PERC_EXCEP && lastLiveCandle.lowest < liveCandle.close; //   lastLiveCandle.isBullish
    // EXCEPTIONS FOR START PROFIT

    const isStartProfit =
        !exceptionResistence &&
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

    if (profitRange) {
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
    const minRangeForSellNetPerc = maxPerc >= MAX_STOP_LOSS_PERC;
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

/* ARCHIVES

// MIN AND MAX DOWNTREND PROFIT
const allowedTrends = ["downtrend", "bullReversal", "bearReversal"];
const primaryCond = isProfit && allowedTrends.includes(currEmaTrend);

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

 */
