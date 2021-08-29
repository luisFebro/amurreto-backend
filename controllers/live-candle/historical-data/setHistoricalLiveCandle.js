const LiveCandleHistory = require("../../../models/LiveCandleHistory");
const { getDiffInMinutes } = require("../../../utils/dates/dateFnsBack");
const getPercentage = require("../../../utils/number/perc/getPercentage");

const LIVE_CANDLE_ID = "612b272114f951135c1938a0";

async function setHistoricalLiveCandle({ side, timestamp, emaTrend }) {
    // liveCandleSideStreak
    // it will be added every 10 min in the DB in the current live candle and empty every new one// it will be added every 10 min in the DB in the current live candle and empty every new one
    // the most recent for both history and sidesStreak starts at the rightmost side to the left.
    const currMin = getDiffInMinutes(timestamp);

    const moreHistory = {
        emaTrend,
    };

    const { sidesStreak, bullSidePerc, bearSidePerc, history } =
        await handleSidesStreak({
            currMin,
            side,
            timestamp,
            moreHistory,
        });

    const newData = {
        timestamp,
        emaTrend,
        sidesStreak, // e.g ["bull", "bear"]
        bullSidePerc,
        bearSidePerc,
        history,
    };

    await LiveCandleHistory.findByIdAndUpdate(LIVE_CANDLE_ID, newData);
}

// HELPERS
async function handleSidesStreak({ currMin, side, timestamp, moreHistory }) {
    const dbData = await LiveCandleHistory.findById(LIVE_CANDLE_ID);

    let dbSidesStreak = dbData && dbData.sidesStreak;
    const dbTimestamp = dbData && dbData.timestamp;
    let dbHistory = dbData && dbData.history;

    // data include: bullSidePerc, bearSidePerc, totalAllSides,
    let percData = getSidePercs(dbSidesStreak);

    // if change, save history and clean the current array
    const hasLiveCandleChanged =
        new Date(timestamp).getHours() !== new Date(dbTimestamp).getHours();

    if (hasLiveCandleChanged) {
        // save last-past-hour candle history
        const MAX_ITEMS = 10;
        const newHistory = [
            {
                timestamp,
                sidesStreak: dbSidesStreak,
                ...percData,
                ...moreHistory,
            },
            ...dbHistory,
        ].slice(0, MAX_ITEMS);

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
        return {
            sidesStreak: [side, ...dbSidesStreak],
            history: dbHistory,
            ...percData,
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
