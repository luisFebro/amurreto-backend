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
    const gotAllSides = totalSides === 6;
    if (gotAllSides) {
        const wasBearishForMostTime = currTimeSidesStreak
            .slice(2)
            .every((side) => side === "bear");
        const gotLastCandlesBullish =
            currTimeSidesStreak.slice(0, 2).some((side) => side === "bull") &&
            currTimeSidesStreak[0] === "bull";
        if (wasBearishForMostTime && gotLastCandlesBullish) {
            return {
                status: true,
                reason: "thunderingChange",
            };
        }
    }

    const isMajorityBull = bullSidePerc >= 66;
    // cond 2
    const isLast3SidesBullish = currTimeSidesStreak
        .slice(0, 3)
        .every((side) => side === "bull" && totalSides >= 2);
    if (isMajorityBull && isLast3SidesBullish && currBodySize === "small") {
        return {
            status: true,
            reason: "threeSmallBullish",
        };
    }

    // cond 3
    const isLast2SidesBullish = currTimeSidesStreak
        .slice(0, 2)
        .every((side) => side === "bull" && totalSides >= 2);
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
