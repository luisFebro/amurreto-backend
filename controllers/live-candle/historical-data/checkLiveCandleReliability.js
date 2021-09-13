// condition to check by time sidestreak if the candle tend to be bullish or bearish or less likely to change sides
// also detect signal thundering change which are candles generally hammers that change to bullish in the last moments

function checkLiveCandleReliability({
    bullSidePerc = 0,
    currBodySize,
    currTimeSidesStreak,
}) {
    const sidesStreak = currTimeSidesStreak ? currTimeSidesStreak : [];
    const currSide = sidesStreak && sidesStreak[0];

    if (currSide === "bear") {
        return {
            status: false,
            reason: "bearsDisabled",
        };
    }

    const totalSides = sidesStreak.length;

    // cond 1
    const gotAlmostAllSides = totalSides === 5; // total is 6 but the last actual last only one minute and may not be detected
    const gotLastCandleBullish =
        currSide === "bull" || (sidesStreak && sidesStreak[0] === "bull");
    if (gotAlmostAllSides && gotLastCandleBullish) {
        if (gotLastCandleBullish) {
            return {
                status: true,
                reason: "almostAllSidesLastBull",
            };
        }
    }

    // cond 2
    const isMajorityBull = bullSidePerc >= 66;
    const keepBullish = totalSides >= 4 && currSide === "bull";
    const cond2BodySizes = ["small", "tiny"];
    const isLast3SidesBullish = sidesStreak
        .slice(0, 3)
        .every((side) => side === "bull");
    if (
        keepBullish &&
        isMajorityBull &&
        isLast3SidesBullish &&
        cond2BodySizes.includes(currBodySize)
    ) {
        return {
            status: true,
            reason: "threeSmallBullish",
        };
    }

    // cond 3
    const minCandles = totalSides >= 3;
    const isLast2SidesBullish = sidesStreak
        .slice(0, 2)
        .every((side) => side === "bull");
    if (minCandles && isLast2SidesBullish && currBodySize === "medium") {
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
