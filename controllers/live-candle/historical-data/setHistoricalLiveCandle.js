const LiveCandleHistory = require("../../../models/LiveCandleHistory");
const { getDiffInMinutes } = require("../../../utils/dates/dateFnsBack");
const getPercentage = require("../../../utils/number/perc/getPercentage");

const LIVE_CANDLE_ID = "612b272114f951135c1938a0";

async function setHistoricalLiveCandle({ side, timestamp, emaTrend }) {
    // liveCandleSideStreak
    // it will be added every 10 min in the DB in the current live candle and empty every new one// it will be added every 10 min in the DB in the current live candle and empty every new one
    // the most recent for both history and sidesStreak starts at the rightmost side to the left.
    const currMin = getDiffInMinutes(timestamp);
    console.log("currMin", currMin);

    const { sidesStreak, totalAllSides } = await handleSidesStreak({
        currMin,
        side,
        timestamp,
    });

    // PERC
    const totalBulls = sidesStreak.filter((side) => side === "bull").length;
    const totalBears = sidesStreak.filter((side) => side === "bear").length;

    const bullSidePerc = getPercentage(totalAllSides, totalBulls);
    const bearSidePerc = getPercentage(totalAllSides, totalBears);
    // END PERC

    const newData = {
        timestamp,
        sidesStreak, // e.g ["bull", "bear"]
        bullSidePerc,
        bearSidePerc,
        emaTrend,
        history: [],
    };

    await LiveCandleHistory.findByIdAndUpdate(LIVE_CANDLE_ID, newData);
}

// HELPERS
async function handleSidesStreak({ currMin, side, timestamp }) {
    const data = await LiveCandleHistory.findById(LIVE_CANDLE_ID);

    let dbSidesStreak = data && data.sidesStreak;
    const dbTimestamp = data && data.timestamp;
    const dbHistory = data && data.history;

    let totalAllSides = dbSidesStreak ? dbSidesStreak.length : 0;

    // if change, save history and clean the current array
    const hasLiveCandleChanged =
        new Date(timestamp).getHours() !== new Date(dbTimestamp).getHours();

    const MAX_ITEMS = 10;
    const newHistory = [
        {
            sidesStreak: dbSidesStreak,
        },
        ...dbHistory,
    ].slice(0, MAX_ITEMS);
    console.log("newHistory", newHistory);
    if (hasLiveCandleChanged) {
        // save last-past-hour candle history
        await LiveCandleHistory.findByIdAndUpdate(LIVE_CANDLE_ID, {
            history: newHistory,
        });

        dbSidesStreak = [];
        totalAllSides = 0;
    }

    const insertNewSide = needPushCurrSide({ currMin, totalAllSides });

    if (insertNewSide) {
        return {
            sidesStreak: [side, ...dbSidesStreak],
            totalAllSides: totalAllSides + 1,
        };
    }

    return {
        sidesStreak: dbSidesStreak,
        totalAllSides,
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
// END HELPERS

module.exports = setHistoricalLiveCandle;
