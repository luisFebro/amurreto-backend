// condition to check by time sidestreak if the candle tend to be bullish or bearish or less likely to change sides
// also detect signal thundering change which are candles generally hammers that change to bullish in the last moments

function checkLiveCandleReliability({
    bullSidePerc = 0,
    bearSidePerc = 0,
    currBodySize,
    currTimeSidesStreak,
}) {
    const sidesStreak = currTimeSidesStreak ? currTimeSidesStreak : [];
    const currSide = sidesStreak && sidesStreak[0];
    const totalSides = sidesStreak.length;

    // less than 30 min are unreliable, every sidesStreak represents 10 min.
    if (!currSide || totalSides < 3) {
        return {
            status: false,
            reason: "less30minSidesStreak",
        };
    }

    const isCurrBullish = currSide === "bull";
    // 66% of hasReliableStrength represents at least 30 minutes (3 side streaks) of the analysed side
    const hasReliableStrength = isCurrBullish
        ? bullSidePerc >= 66
        : bearSidePerc >= 66;

    // BEARISH TRUST COND
    const keepReliableBear = totalSides >= 4 && !isCurrBullish;
    if (hasReliableStrength && keepReliableBear) {
        return {
            status: true,
            // do not change this name, effects handleUnreliableBuySignal in warchStrategies
            reason: "40minBearishReliable",
        };
    }
    // BEARISH TRUST COND

    // cond 1 - min 50 minutes from candle duration to be reliable
    const gotAlmostAllSides = totalSides === 5; // total is 6 but the last actual last only one minute and may not be detected
    if (gotAlmostAllSides && isCurrBullish) {
        return {
            status: true,
            reason: "finalReliable",
        };
    }

    // cond 2 - min 40 minutes from candle duration to be reliable
    const keepReliable40Min = totalSides >= 4 && isCurrBullish;
    const cond2BodySizes = ["small", "tiny"];
    const isLast3SidesReliable = sidesStreak
        .slice(0, 3)
        .every((side) => side === currSide);
    if (
        keepReliable40Min &&
        hasReliableStrength &&
        isLast3SidesReliable &&
        cond2BodySizes.includes(currBodySize)
    ) {
        return {
            status: true,
            reason: "40minReliable",
        };
    }

    // cond 3 - min 30 minutes from candle duration to be reliable
    const minCandles = totalSides >= 3;
    const reliable30MinSizes = ["small", "medium"];
    const isLast2SidesReliable = sidesStreak
        .slice(0, 2)
        .every((side) => side === currSide);
    if (
        minCandles &&
        isLast2SidesReliable &&
        reliable30MinSizes.includes(currBodySize)
    ) {
        return {
            status: true,
            reason: "30minReliable",
        };
    }

    return {
        status: false,
        reason: "noCondMatch",
    };
}

module.exports = checkLiveCandleReliability;
