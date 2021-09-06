async function getCandlePatternsSignal({
    liveCandle,
    lastLiveCandle,
    sequenceStreaks,
}) {
    const liveBodySize = liveCandle.candleBodySize;

    const threeCandleType = liveCandle.threeCandleType || " ";
    const twoCandleType = liveCandle.twoCandleType || " ";
    const oneCandleType = liveCandle.oneCandleType || " ";

    // THREE CANDLES
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
    // END THREE CANDLES

    // TWO CANDLES
    const runTweezers = twoCandleType.includes("tweezers");
    if (runTweezers) {
        return {
            signal: "BUY",
            strategy: "patternTWEEZERS",
            transactionPerc: 100,
        };
    }

    const runPowerConfirmed = checkPowerConfirmed({
        lastLiveCandle,
        liveBodySize,
    });
    if (runPowerConfirmed) return runPowerConfirmed;
    // END TWO CANDLES

    // ONE CANDLE
    const isCurrStreakBearish = sequenceStreaks.includes("A.bears"); // because it is more powerful when there is a sudden change in the candle and strong indication of reversal.
    const runSoloPowerThor =
        isCurrStreakBearish && oneCandleType.includes("soloThor");
    if (runSoloPowerThor) {
        return {
            signal: "BUY",
            strategy: "soloPowerThor",
            transactionPerc: 100,
        };
    }
    // END ONE CANDLE

    // empty signal handle with strategiesManager
    return { signal: null };
}

// HELPERS
// IMPORTANT: the backtesting for this strategy is not available
// since the data collected are from live candles - current and last - respectively and there is no back tracing of data
function checkPowerConfirmed({ lastLiveCandle, liveBodySize }) {
    const lastOneCandleType = lastLiveCandle.oneCandleType || " ";

    const isThorHammer =
        lastOneCandleType.includes("hammer") &&
        lastOneCandleType.includes("thor") &&
        "powerThorHammer";
    const isHighWaveDoji =
        lastOneCandleType.includes("doji") &&
        lastOneCandleType.includes("high wave") &&
        "powerHighWaveDoji";

    const confirmationCandle = ["small", "medium"].includes(liveBodySize);
    const powerCandle = confirmationCandle && (isThorHammer || isHighWaveDoji);

    if (!powerCandle) return null;

    return {
        signal: "BUY",
        strategy: powerCandle,
        transactionPerc: 100,
    };
}

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
