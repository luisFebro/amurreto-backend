// condition to check by time sidestreak if the candle tend to be bullish or bearish or less likely to change sides
// also detect signal thundering change which are candles generally hammers that change to bullish in the last moments

function checkLiveCandleRealibility({
    bullSidePerc = 0,
    // currBodySize,
    // currTimeSidesStreak = [],
    // bearSidePerc = 0,
    // lastTimeCandle,
}) {
    console.log("currBodySize", currBodySize);
    const currBodySize = "medium";
    const currTimeSidesStreak = ["bull", "bull", "bear", "bear", "bear"];
    // console.log("bearSidePerc", bearSidePerc);
    // console.log("bullSidePerc", bullSidePerc);
    // console.log("currBodySize", currBodySize);
    // console.log("currTimeSidesStreak.slice(0, 2)", currTimeSidesStreak.slice(0, 2));

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

    const isMajorityBull = bullSidePerc > 66;
    // cond 2
    const isLast3SidesBullish = currTimeSidesStreak
        .slice(0, 3)
        .every((side) => side === "bull" && currTimeSidesStreak.length === 3);
    if (
        isMajorityBull &&
        isLast3SidesBullish &&
        currBodySize === "small" &&
        totalSides >= 3
    ) {
        return {
            status: true,
            reason: "threeSmallBullish",
        };
    }

    // cond 3
    const isLast2SidesBullish = currTimeSidesStreak
        .slice(0, 2)
        .every((side) => side === "bull" && currTimeSidesStreak.length === 2);
    if (isLast2SidesBullish && currBodySize === "medium" && totalSides >= 2) {
        return {
            status: true,
            reason: "twoMediumBullish",
        };
    }

    return {
        status: false,
        reason: "",
    };
}

module.exports = checkLiveCandleRealibility;
