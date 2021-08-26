const { isHammer, isDoji } = require("./one-candle/oneCandle");
const { areTweezers, isHarami } = require("./two-candles/twoCandles");
const { isThreeInsideUp } = require("./three-candles/threeCandles");

function findCandleTypes({ candlesDataAnalysis = [] }) {
    let oneCandleType = "";
    let twoCandleType = "";
    let threeCandleType = "";

    const currCandleData = candlesDataAnalysis.length
        ? candlesDataAnalysis.slice(-1)[0]
        : {};
    const {
        openPrice,
        volCandleBodyPerc,
        volCandleUpperPerc,
        volCandleLowerPerc,
    } = currCandleData;

    // it is always up to 3 array elements length so that we can have data to analyse all candle patterns
    // LESSON: at least 3 candles data should be included, otherwise A and B can receive no data.
    const candleA = candlesDataAnalysis[2] || {};
    const candleB = candlesDataAnalysis[1] || {};
    const candleC = candlesDataAnalysis[0] || {};

    const defaultData = {
        upper: volCandleUpperPerc,
        body: volCandleBodyPerc,
        lower: volCandleLowerPerc,
        currOpen: openPrice,
        // candleC, candleB, candleA = candleA is the most recent
        candleA: {
            side: candleA.isBullish ? "bull" : "bear",
            ...candleA,
        },
        candleB: {
            side: candleB.isBullish ? "bull" : "bear",
            ...candleB,
        },
        candleC: {
            side: candleC.isBullish ? "bull" : "bear",
            ...candleC,
        },
    };

    // single candle
    if (isDoji(defaultData)) oneCandleType = "doji";
    if (isHammer(defaultData)) oneCandleType = "hammer";
    // end single candle

    // 2 candles
    if (areTweezers(defaultData)) twoCandleType = "tweezers";
    if (isHarami(defaultData)) twoCandleType = "harami";
    // end 2 candles

    // 3 candles
    if (isThreeInsideUp(defaultData)) threeCandleType = "threeInsideUp";
    // end 3 candles

    return {
        oneCandleType,
        twoCandleType,
        threeCandleType,
    };
}

module.exports = findCandleTypes;
