const isHammer = require("../one-candle/hammer");
const isDoji = require("../one-candle/doji");

/* Candle Eater (my own)
Indication: Bullish/Bearish reversal
Reliability: Medium

It is a different engulfing which consists of wrapping up completing two last candles, especially the candleC opening id bearish, the closing price if bullish
Also the candleBodySize is taken into account being big or huge and candle reliability to confirm consistency in the candle`s direction

 */

const isCandleEater = (data) => {
    const { candleA, candleB, candleC } = data;
    const gotAllCandlesData =
        candleA.openPrice && candleB.openPrice && candleC.openPrice;
    if (!gotAllCandlesData) return false;

    const sizesCandleA = ["big", "huge"];
    const matchSizes = sizesCandleA.includes(candleA.bodySize);
    if (!matchSizes) return false;

    const matchCandleBAnyStarType =
        isHammer({ candleA: candleB }) || isDoji({ candleA: candleB });

    const matchCandleCAnyStarType =
        isHammer({ candleA: candleC }) || isDoji({ candleA: candleC });
    if (!matchCandleBAnyStarType && !matchCandleCAnyStarType) return false;

    const isCandleABull = candleA.side === "bull";

    const variant = isCandleABull ? "bullishEngulfing" : "bearishEngulfing";

    const doesCandleEatOthers = isCandleABull
        ? candleA.closePrice > candleC.closePrice
        : candleA.closePrice < candleC.openPrice;
    if (!doesCandleEatOthers) return false;

    return {
        type: "candleEater",
        pressureA: candleA.pressure,
        variant,
    };
};

module.exports = isCandleEater;
