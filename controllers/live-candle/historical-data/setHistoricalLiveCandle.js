const LiveCandleHistory = require("../../../models/LiveCandleHistory");
const { getDiffInMinutes } = require("../../../utils/dates/dateFnsBack");
const getPercentage = require("../../../utils/number/perc/getPercentage");
const checkLiveCandleRealibility = require("./checkLiveCandleRealibity");

const LIVE_CANDLE_ID = "612b272114f951135c1938a0";

async function setHistoricalLiveCandle({
    side,
    timestamp,
    emaTrend,
    openPrice,
    currBodySize,
}) {
    // liveCandleSideStreak
    // it will be added every 10 min in the DB in the current live candle and empty every new one// it will be added every 10 min in the DB in the current live candle and empty every new one
    // the most recent for both history and sidesStreak starts at the rightmost side to the left.
    const currMin = getDiffInMinutes(timestamp);

    const { sidesStreak, bullSidePerc, bearSidePerc, history } =
        await handleSidesStreak({
            currMin,
            side,
            timestamp,
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
    };

    await LiveCandleHistory.findByIdAndUpdate(LIVE_CANDLE_ID, newData);

    // return { status: true, reason: "thunderingChange" }
    const resRealibility = checkLiveCandleRealibility({
        currTimeSidesStreak: sidesStreak,
        lastTimeCandle: history && history[0],
        bullSidePerc,
        bearSidePerc,
        currBodySize,
    });

    return resRealibility;
}

// HELPERS
async function handleSidesStreak({ currMin, side, timestamp }) {
    const dbData = await LiveCandleHistory.findById(LIVE_CANDLE_ID);

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
        const MAX_LAST_ITEMS = 100;
        const newHistory = [
            {
                timestamp: dbTimestamp,
                sidesStreak: dbSidesStreak,
                openPrice: dbData && dbData.openPrice,
                emaTrend: dbData && dbData.emaTrend,
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
    if (totalAllSides === 0 && currMin < 10) return true;
    if (totalAllSides === 1 && currMin >= 10 && currMin < 20) return true;
    if (totalAllSides === 2 && currMin >= 20 && currMin < 30) return true;
    if (totalAllSides === 3 && currMin >= 30 && currMin < 40) return true;
    if (totalAllSides === 4 && currMin >= 40 && currMin < 50) return true;
    if (totalAllSides === 5 && currMin >= 50) return true;

    return false;
}

function getSidePercs(dbSidesStreak) {
    const totalAllSides = dbSidesStreak ? dbSidesStreak.length : 0;

    const totalBulls = dbSidesStreak.filter((side) => side === "bull").length;
    const totalBears = dbSidesStreak.filter((side) => side === "bear").length;

    return {
        bullSidePerc: getPercentage(totalAllSides, totalBulls),
        bearSidePerc: getPercentage(totalAllSides, totalBears),
        totalAllSides,
    };
}
// END HELPERS

module.exports = setHistoricalLiveCandle;
