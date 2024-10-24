const { isHammer, isDoji } = require("./one-candle/oneCandle");
const {
    areTweezers,
    isHarami,
    isEngulfing,
    isFreeFall,
    isCandleEater,
    areBullBros,
} = require("./two-candles/twoCandles");
const {
    isThreeInside,
    isThreeOutside,
    isStar,
    isThunderingChange,
} = require("./three-candles/threeCandles");

function findCandleTypes({ candlesDataAnalysis = [] }) {
    let oneCandleType = "";
    let twoCandleType = "";
    let threeCandleType = "";

    // it is always up to 3 array elements length so that we can have data to analyse all candle patterns
    // LESSON: at least 3 candles data should be included, otherwise A and B can receive no data.
    const defaultData = {
        // candleC, candleB, candleA = candleA is the most recent
        candleA: candlesDataAnalysis[2] || {},
        candleB: candlesDataAnalysis[1] || {},
        candleC: candlesDataAnalysis[0] || {},
    };

    // IMPORTANT: do not ever change like hammer and doji order because that some parts of logic depend on it

    // single candle
    const isShorty = (data) => {
        const { candleA } = data;
        const cond = candleA.side === "bull" && candleA.bodySize === "small";
        if (!cond) return false;

        return {
            type: "shorty",
            variant: "bullish",
            pressureA: candleA.pressure,
        };
    };

    const checkShorty = isShorty(defaultData);
    if (checkShorty) oneCandleType = JSON.stringify(checkShorty);

    const checkHammer = isHammer(defaultData);
    if (checkHammer) oneCandleType = JSON.stringify(checkHammer);

    const checkDoji = isDoji(defaultData);
    if (checkDoji) oneCandleType = JSON.stringify(checkDoji);
    // end single candle

    // 2 candles
    const isMedium = (data) => {
        const { candleB, candleA } = data;
        const cond =
            candleB.side === "bull" &&
            candleA.side === "bull" &&
            candleA.bodySize === "medium";
        if (!cond) return false;

        return {
            type: "medium",
            variant: "bullish",
            pressureA: candleA.pressure,
        };
    };

    const checkMedium = isMedium(defaultData);
    if (checkMedium) twoCandleType = JSON.stringify(checkMedium);

    const checkBullBros = areBullBros(defaultData);
    if (checkBullBros) twoCandleType = JSON.stringify(checkBullBros);

    const checkHarami = isHarami(defaultData);
    if (checkHarami) twoCandleType = JSON.stringify(checkHarami);

    const checkCandleEater = isCandleEater(defaultData);
    if (checkCandleEater) twoCandleType = JSON.stringify(checkCandleEater);

    const checkEngulfing = isEngulfing(defaultData);
    if (checkEngulfing) twoCandleType = JSON.stringify(checkEngulfing);

    const checkTweezers = areTweezers(defaultData);
    if (checkTweezers) twoCandleType = JSON.stringify(checkTweezers);

    const checkFreeFall = isFreeFall(defaultData);
    if (checkFreeFall) twoCandleType = JSON.stringify(checkFreeFall);
    // end 2 candles

    // 3 candles
    const checkThreeInside = isThreeInside(defaultData);
    if (checkThreeInside) threeCandleType = JSON.stringify(checkThreeInside);

    const checkThreeOutside = isThreeOutside(defaultData);
    if (checkThreeOutside) threeCandleType = JSON.stringify(checkThreeOutside);

    const checkStar = isStar(defaultData);
    if (checkStar) threeCandleType = JSON.stringify(checkStar);

    const checkThunderingChange = isThunderingChange(defaultData);
    if (checkThunderingChange)
        threeCandleType = JSON.stringify(checkThunderingChange);
    // end 3 candles

    return {
        oneCandleType,
        twoCandleType,
        threeCandleType,
    };
}

module.exports = findCandleTypes;
