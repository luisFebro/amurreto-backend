const blockEmaUptrend = require("../ema/blockEmaUptrend");
const MAX_STOP_LOSS_PERC = 1;

async function getProfitTrackerSignal({
    profitTracker = {},
    liveCandle,
    lastLiveCandle,
    higherWing,
    stoplossGrandCandle,
    lastProfitRow,
    // isContTrend,
}) {
    const {
        watching,
        maxPerc,
        // maxCurrPrice,
    } = profitTracker;
    if (!watching) return { signal: null, whichStrategy: "tracker" };

    const currEmaTrend = liveCandle.emaTrend;
    const currStrategy = profitTracker.strategy;
    // block uptrend in order to be prevented more than once in the same trend.
    // if started off with other strategy, then allow only one more emaUptrend to be detected.
    const areLastProfit = lastProfitRow.every((p) => p === true);
    const condBlockUptrend =
        maxPerc >= 3 &&
        currStrategy === "emaUptrend" &&
        currEmaTrend === "uptrend" &&
        !areLastProfit;
    if (condBlockUptrend) await blockEmaUptrend("toggle", true);

    return {
        whichStrategy: "tracker",
        ...getTrackerStrategy({
            ...profitTracker,
            lastLiveCandle,
            currEmaTrend,
            currStrategy,
            liveCandle,
            higherWing,
            stoplossGrandCandle,
            hasPassedNextLevel: condBlockUptrend,
        }),
    };
}

// PROFIT STRATEGIES
// function getContTrendStrategy({ profitTracker, isContTrend }) {
//     if (!isContTrend) return false;
//     const DOWN_RANGE_DIFF = 0.2;

//     const { maxPerc, netPerc } = profitTracker;

//     const nextProfitGoalPerc = Math.round(maxPerc);
//     const limitDown = nextProfitGoalPerc - DOWN_RANGE_DIFF;
//     const finalRange = limitDown <= netPerc && netPerc <= nextProfitGoalPerc;
//     const isGoSignal = finalRange && nextProfitGoalPerc >= 3;
//     if (!isGoSignal) return false;

//     return {
//         whichStrategy: "contTrend",
//         signal: "SELL",
//         strategy: `contTrendLevel${nextProfitGoalPerc}`,
//         transactionPerc: 100,
//     };
// }

// tracker is automatically activate in downtrend, bullReversal and bearReversal
function getTrackerStrategy(data) {
    const {
        maxPerc,
        diffMax,
        netPerc,
        liveCandle,
        lastLiveCandle,
        higherWing,
        currStrategy,
        // minPerc,
        hasPassedNextLevel,
        stoplossGrandCandle,
    } = data;
    // const emaTrend = liveCandle.emaTrend;

    const nextLevel = hasPassedNextLevel ? "NextLevel" : "";
    const livePrice = liveCandle.close;

    const BELOW_CANDLE_SPAN = 500;

    // grandcandle is a fixed big/huge candle used as stoploss instead of the last one.
    // red zone is for still detect a grand candle. Otherwise, it will be ignored.
    const lowestGrandCandleAllowed =
        stoplossGrandCandle.lowest - BELOW_CANDLE_SPAN;
    const redZoneGrandCandleDetect = Math.abs(
        livePrice - lowestGrandCandleAllowed
    );
    const RED_ZONE_LIMIT = 1000;
    const needGrandCandle = redZoneGrandCandleDetect <= RED_ZONE_LIMIT;

    const isBelowGrandcandleStoploss =
        needGrandCandle && livePrice < lowestGrandCandleAllowed;
    const isBelowLastLiveCandle =
        livePrice < lastLiveCandle.lowest - BELOW_CANDLE_SPAN;
    console.log("isBelowGrandcandleStoploss", isBelowGrandcandleStoploss);
    console.log("isBelowLastLiveCandle", isBelowLastLiveCandle);

    const isBelowStoploss = needGrandCandle
        ? isBelowGrandcandleStoploss
        : isBelowLastLiveCandle;

    // MAX
    const overboughtZone = higherWing.diffCurrPrice;
    const SELL_ZONE_LIMIT = 2000;
    const maxProfitHigherWing =
        nextLevel && isBelowLastLiveCandle && overboughtZone <= SELL_ZONE_LIMIT;

    if (maxProfitHigherWing) {
        return {
            signal: "SELL",
            strategy: "maxProfitHigherWing",
            transactionPerc: 100,
        };
    }

    // safeguard emaTrend entry (e.g 2021-11-10T14:39:32.867+00:00) where the entry can be a higher with a steep bearish plummet
    const isEmaTrend = currStrategy === "emaUptrend";
    let isSafeguardEmaTrend =
        isEmaTrend &&
        ((maxPerc < 1 && isBelowLastLiveCandle) ||
            (maxPerc >= 1 && maxPerc < 2 && isBelowGrandcandleStoploss));

    if (isSafeguardEmaTrend) {
        return {
            signal: "SELL",
            strategy: "safeguardEmatrend",
            transactionPerc: 100,
        };
    }

    const maxProfitStopLoss = netPerc <= Number(`-${MAX_STOP_LOSS_PERC}`);
    if (isBelowStoploss && maxProfitStopLoss) {
        return {
            signal: "SELL",
            strategy: "maxProfitStopLoss",
            transactionPerc: 100,
        };
    }

    if (isBelowStoploss) {
        return {
            signal: "SELL",
            strategy: "grandStopLossProfit",
            transactionPerc: 100,
        };
    }
    // END MAX

    const handleMaxDiffZones = () => {
        // the minimum profit is 0.4 to trigger a sell signal.
        // const highBearReversalZoneA = maxPerc >= 0.4 && maxPerc < 8;
        // const highBearReversalZoneB = maxPerc >= 0.8 && maxPerc < 1.2;
        // if (highBearReversalZoneA) return 0.2;
        // if (highBearReversalZoneB) return 0.3;
        return 0; // 0.5
    };

    const MAX_DIFF_START_PROFIT = handleMaxDiffZones();
    const MAX_DIFF_MID_PROFIT = 0; //emaTrend === "uptrend" ? 1 : 0.5;
    // const MAX_DIFF_LONG_PROFIT = 0; // 0.5
    // using maxPerc instead of netPerc so that it can be not change when price went back down and keep profit.
    const startProfitRange = maxPerc >= 0 && maxPerc < 1.5;
    const midProfitRange = maxPerc >= 1.5 && maxPerc < 4;
    const longProfitRange = maxPerc >= 10;

    // EXCEPTIONS FOR START PROFIT
    const isStartProfit =
        isBelowStoploss &&
        startProfitRange &&
        diffMax >= MAX_DIFF_START_PROFIT &&
        `startProfit${nextLevel}`;
    const isMidProfit =
        isBelowStoploss &&
        midProfitRange &&
        diffMax >= MAX_DIFF_MID_PROFIT &&
        `midProfit${nextLevel}`;
    const isLongProfit =
        nextLevel && isBelowLastLiveCandle && longProfitRange && `longProfit`;
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
// as long as the current transaction comes from downtrend.
// That's because when reaching uptrend and no transaction, the algo automatically buy and sell only when a downtrend signal pops up
// function getAtrStrategy(data) {
//     const {
//         atrLowedsadsarLimit,
//         livePrice,
//         maxPerc,
//         // netPerc,
//         // atrLimit,
//     } = data;
//     const minRangeForSellNetPerc = maxPerc >= MAX_STOP_LOSS_PERC;
//     const atrSellCond = minRangeForSellNetPerc || livePrice <= atrLowedsadsarLimit;

//     if (atrSellCond) {
//         return {
//             signal: "SELL",
//             strategy: "atrProfitStopLoss",
//             transactionPerc: 100,
//         };
//     }

//     // empty signal handle with strategiesManager
//     return { signal: null };
// }
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

const contTrendSignal = getContTrendStrategy({
    profitTracker,
    isContTrend,
});
if (contTrendSignal) return contTrendSignal;

const livePrice = liveCandle.close;

const hasPassedAtrUppefsdrLimit = maxCurrPrice >= atrUpdadsdperLimit;
const atrTrends = ["uptrend"];
const condAtr = maxPerc >= 3 && atrTrends.includes(currEmaTrend);
const whichStrategy = condAtr ? "atr" : "tracker";

if (whichStrategy === "atr")
    return {
        whichStrategy: "atr",
        ...getAtrStrategy({ ...profitTracker, livePrice }),
    };


// exception resistence when there is a bearish candle, but not reached the bottom (lowest) of the last candle with potential to a sudden reversal to upside.
// to avoid losing all profit more than expecting due to prior candle is big or huge size
const isBearish = !liveCandle.isBullish;
const skipBearishCandles = ["huge"];
const skipExceptionBySize =
    isBearish && skipBearishCandles.includes(lastLiveCandle.candleBodySize);

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
