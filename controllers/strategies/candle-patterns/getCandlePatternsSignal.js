async function getCandlePatternsSignal({
    liveCandle,
    lastLiveCandle,
    lowerWing20,
}) {
    const liveBodySize = liveCandle.candleBodySize;
    const isCurrBullish = liveCandle.isBullish;

    const threeCandleType = liveCandle.threeCandleType || " ";
    const twoCandleType = liveCandle.twoCandleType || " ";
    const oneCandleType = liveCandle.oneCandleType || " ";

    // THREE CANDLES
    const runThunderingChange = threeCandleType.includes("thunderingChange");
    if (runThunderingChange) {
        return {
            signal: "BUY",
            strategy: "thunderingChange",
            transactionPerc: 100,
        };
    }

    const star = checkCandlePatternSignal("star", "morning", threeCandleType);
    if (star) return star;

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
    const runBroBulls = twoCandleType.includes("broBulls");
    if (runBroBulls) {
        return {
            signal: "BUY",
            strategy: "broBulls",
            transactionPerc: 100,
        };
    }

    const runCandleEater = twoCandleType.includes("candleEater");
    if (runCandleEater) {
        return {
            signal: isCurrBullish ? "BUY" : "SELL",
            strategy: "candleEater",
            transactionPerc: 100,
        };
    }
    const runFreeFall = twoCandleType.includes("freeFall");
    if (runFreeFall) {
        return {
            signal: "BUY",
            strategy: "freeFall",
            transactionPerc: 100,
        };
    }

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
    const runMedium = twoCandleType.includes("medium");
    if (runMedium) {
        return {
            signal: "BUY",
            strategy: "medium",
            transactionPerc: 100,
        };
    }

    const runShorty = oneCandleType.includes("shorty");
    if (runShorty) {
        return {
            signal: "BUY",
            strategy: "shorty",
            transactionPerc: 100,
        };
    }

    const isNearSupport = lowerWing20 <= 7000; // 3500 allow run this only near the support
    const runSoloPowerThor =
        isNearSupport && oneCandleType.includes("soloThor");
    if (runSoloPowerThor) {
        return {
            signal: "BUY",
            strategy: "soloPowerThor",
            transactionPerc: 100,
        };
    }

    const runSoloHighWaveDoji =
        isNearSupport && oneCandleType.includes("soloHighWave");
    if (runSoloHighWaveDoji) {
        return {
            signal: "BUY",
            strategy: "soloHighWave",
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
        lastOneCandleType.includes("soloThor") &&
        "powerThorHammer";
    const isHighWaveDoji =
        lastOneCandleType.includes("doji") &&
        lastOneCandleType.includes("highWave") &&
        "powerHighWaveDoji";

    const confirmationCandle = ["tiny", "small", "medium"].includes(
        liveBodySize
    );
    const powerCandle = confirmationCandle && (isThorHammer || isHighWaveDoji);
    if (!powerCandle) return false;

    return {
        signal: "BUY",
        strategy: powerCandle || "someWentWrongPowerCand",
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

/* ARCHIVES

const runThreeOutsideEatAll = checkCandlePatternSignal(
    "threeOutsideEatAll",
    "up",
    threeCandleType
);
if (runThreeOutsideEatAll) return runThreeOutsideEatAll;

*/
