const LiveCandleHistory = require("../../../models/LiveCandleHistory");
const { getDiffInMinutes } = require("../../../utils/dates/dateFnsBack");
const getPercentage = require("../../../utils/number/perc/getPercentage");
const checkLiveCandleReliability = require("./checkLiveCandleReliability");
const { IS_DEV } = require("../../../config");

const LIVE_CANDLE_ID = "613ed80dd3ce8cd2bbce76cb";

async function setHistoricalLiveCandle({
    side,
    timestamp,
    emaTrend,
    openPrice,
    currBodySize,
    wholeCandleSize,
    lowerWing20,
    sequenceStreaks,
}) {
    // the data will be mingled with current local dev, so only in prod.
    if (IS_DEV) return { candleReliability: {}, dbEmaUptrend: {} };

    // liveCandleSideStreak
    // it will be added every 10 min in the DB in the current live candle and empty every new one// it will be added every 10 min in the DB in the current live candle and empty every new one
    // the most recent for both history and sidesStreak starts at the rightmost side to the left.
    const currMin = getDiffInMinutes(timestamp);

    const dbData = await LiveCandleHistory.findById(LIVE_CANDLE_ID);

    const { sidesStreak, bullSidePerc, bearSidePerc, history } =
        handleSidesStreak({
            currMin,
            side,
            timestamp,
            dbData,
        });

    // return { status: true, reason: "thunderingChange" }
    // it is here because use percentage from live candle
    const candleReliability = checkLiveCandleReliability({
        currBodySize,
        currTimeSidesStreak: sidesStreak,
        bullSidePerc,
        bearSidePerc,
        // lastTimeCandle: history && history[0],
    });

    const newData = {
        timestamp,
        emaTrend,
        sidesStreak, // e.g ["bull", "bear"]
        bullSidePerc,
        bearSidePerc,
        history,
        openPrice,
        bodySize: currBodySize,
        lowerWing20,
        sequenceStreaks,
        wholeCandleSize,
        candleReliability,
    };

    await LiveCandleHistory.findByIdAndUpdate(LIVE_CANDLE_ID, newData);

    return candleReliability;
}

// HELPERS
function handleSidesStreak({ dbData, currMin, side, timestamp }) {
    let dbSidesStreak = dbData && dbData.sidesStreak;
    const dbTimestamp = dbData && dbData.timestamp;
    let dbHistory = dbData && dbData.history;

    // data include: bullSidePerc, bearSidePerc, totalAllSides,
    let percData = getSidePercs(dbSidesStreak);

    // if change, save history and clean the current array
    const currHour = new Date(timestamp).getHours();
    const dbHour = new Date(dbTimestamp).getHours();
    const gotAllStreak = dbSidesStreak && dbSidesStreak.length === 6;
    const hasLiveCandleChanged = !dbHour
        ? false
        : currHour !== dbHour && gotAllStreak;

    if (hasLiveCandleChanged) {
        // save last-past-hour candle history
        const MAX_LAST_ITEMS = 20;
        const newHistory = [
            {
                timestamp: dbTimestamp,
                sidesStreak: dbSidesStreak,
                openPrice: dbData && dbData.openPrice,
                emaTrend: dbData && dbData.emaTrend,
                bodySize: dbData && dbData.bodySize,
                lowerWing20: dbData && dbData.lowerWing20,
                sequenceStreaks: dbData && dbData.sequenceStreaks,
                wholeCandleSize: dbData && dbData.wholeCandleSize,
                ...percData,
            },
            ...dbHistory,
        ].slice(0, MAX_LAST_ITEMS);

        dbHistory = newHistory;
        dbSidesStreak = [];
        percData = {
            bullSidePerc: 0,
            bearSidePerc: 0,
            totalAllSides: 0,
        };
    }

    const insertNewSide = needPushCurrSide({
        currMin,
        totalAllSides: percData.totalAllSides,
    });

    if (insertNewSide) {
        const newSidesStreak = [side, ...dbSidesStreak];
        const newPercData = getSidePercs(newSidesStreak);

        return {
            sidesStreak: newSidesStreak,
            history: dbHistory,
            ...newPercData,
        };
    }

    return {
        sidesStreak: dbSidesStreak,
        history: dbHistory,
        ...percData,
    };
}

// goal: insert side only once and every 10 minute
// 6 sides for hour.
// after adding one side in a cond which is true, the totalAllSides will read the next value which range will only be true when the currMin is within.
function needPushCurrSide({ currMin, totalAllSides }) {
    if (totalAllSides === 5 && currMin >= 59) return true; // this one is closer so that we can have a more accurate and closer result of the current candle final state
    if (totalAllSides === 4 && currMin >= 50) return true;
    if (totalAllSides === 3 && currMin >= 40) return true;
    if (totalAllSides === 2 && currMin >= 30) return true;
    if (totalAllSides === 1 && currMin >= 20) return true;
    if (totalAllSides === 0 && currMin >= 10) return true;

    return false;
}

function getSidePercs(dbSidesStreak) {
    const totalAllSides = dbSidesStreak ? dbSidesStreak.length : 0;

    const totalBulls = dbSidesStreak
        ? dbSidesStreak.filter((side) => side === "bull").length
        : 0;
    const totalBears = dbSidesStreak
        ? dbSidesStreak.filter((side) => side === "bear").length
        : 0;

    return {
        bullSidePerc: getPercentage(totalAllSides, totalBulls),
        bearSidePerc: getPercentage(totalAllSides, totalBears),
        totalAllSides,
    };
}
// END HELPERS

module.exports = setHistoricalLiveCandle;
