async function getCandlePatternsSignal({ liveCandle }) {
    const threeCandleType = liveCandle.threeCandleType || " ";
    const twoCandleType = liveCandle.twoCandleType || " ";

    const star = checkCandlePatternSignal("star", "morning", threeCandleType);
    if (star) return star;

    const runThreeOutsideEatAll = checkCandlePatternSignal(
        "threeOutsideEatAll",
        "up",
        threeCandleType
    );
    if (runThreeOutsideEatAll) return runThreeOutsideEatAll;

    const runThreeOutside = checkCandlePatternSignal(
        "threeOutside",
        "up",
        threeCandleType
    );
    if (runThreeOutside) return runThreeOutside;

    const runThreeInside = checkCandlePatternSignal(
        "threeInside",
        "up",
        threeCandleType
    );
    if (runThreeInside) return runThreeInside;

    const runTweezers = twoCandleType.includes("tweezers");
    if (runTweezers) {
        return {
            signal: "BUY",
            strategy: "patternTWEEZERS",
            transactionPerc: 100,
        };
    }

    // empty signal handle with strategiesManager
    return { signal: null };
}

// HELPERS
function checkCandlePatternSignal(strategyName, buyCond, data) {
    // data is like this: '{"type":"threeOutside","variant":"down","pressureA":{"part":"body","perc":66}}'
    const runStrategy = data.includes(strategyName);
    if (!runStrategy) return false;

    const defaultData = {
        strategy: `pattern${strategyName && strategyName.toUpperCase()}`,
        transactionPerc: 100,
    };

    const isBuy = data.includes(buyCond);
    if (isBuy) {
        return {
            signal: "BUY",
            ...defaultData,
        };
    }

    return {
        signal: "SELL",
        ...defaultData,
    };
}
// END HELPERS

module.exports = getCandlePatternsSignal;
