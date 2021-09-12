// condition to check by time sidestreak if the candle tend to be bullish or bearish or less likely to change sides
// also detect signal thundering change which are candles generally hammers that change to bullish in the last moments

function checkLiveCandleReliability({
    bullSidePerc = 0,
    currBodySize,
    currTimeSidesStreak = [],
    // bearSidePerc = 0,
    // lastTimeCandle,
}) {
    const currSide = currTimeSidesStreak && currTimeSidesStreak[0];
    if (currSide === "bear") {
        return {
            status: false,
            reason: "bearsDisabled",
        };
    }

    const totalSides = currTimeSidesStreak.length;

    // cond 1
    const gotAlmostAllSides = totalSides === 5; // total is 6
    if (gotAlmostAllSides) {
        const isAtLeastHalfBull = bullSidePerc >= 50;
        const gotLastCandleBullish = currTimeSidesStreak
            .slice(0, 1)
            .every((side) => side === "bull");
        if (isAtLeastHalfBull && gotLastCandleBullish) {
            return {
                status: true,
                reason: "atLeastHalfLastBulls",
            };
        }
    }

    // cond 2
    const isMajorityBull = bullSidePerc >= 66;
    const cond2BodySizes = ["small", "tiny"];
    const isLast4SidesBullish = currTimeSidesStreak
        .slice(0, 4)
        .every((side) => side === "bull" && totalSides >= 4);
    if (
        isMajorityBull &&
        isLast4SidesBullish &&
        cond2BodySizes.includes(currBodySize)
    ) {
        return {
            status: true,
            reason: "threeSmallBullish",
        };
    }

    // cond 3
    const isLast2SidesBullish = currTimeSidesStreak
        .slice(0, 2)
        .every((side) => side === "bull" && totalSides >= 3);
    if (isLast2SidesBullish && currBodySize === "medium") {
        return {
            status: true,
            reason: "twoMediumBullish",
        };
    }

    return {
        status: false,
        reason: "noCondMatch",
    };
}

module.exports = checkLiveCandleReliability;
