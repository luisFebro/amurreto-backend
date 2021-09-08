const { isHammer, isDoji } = require("./one-candle/oneCandle");
const {
    areTweezers,
    isHarami,
    isEngulfing,
    isFreeFall,
} = require("./two-candles/twoCandles");
const {
    isThreeInside,
    isThreeOutside,
    isStar,
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
    const checkHammer = isHammer(defaultData);
    if (checkHammer) oneCandleType = JSON.stringify(checkHammer);

    const checkDoji = isDoji(defaultData);
    if (checkDoji) oneCandleType = JSON.stringify(checkDoji);
    // end single candle

    // 2 candles
    const checkHarami = isHarami(defaultData);
    if (checkHarami) twoCandleType = JSON.stringify(checkHarami);

    const checkTweezers = areTweezers(defaultData);
    if (checkTweezers) twoCandleType = JSON.stringify(checkTweezers);

    const checkEngulfing = isEngulfing(defaultData);
    if (checkEngulfing) twoCandleType = JSON.stringify(checkEngulfing);

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
    // end 3 candles

    return {
        oneCandleType,
        twoCandleType,
        threeCandleType,
    };
}

module.exports = findCandleTypes;
