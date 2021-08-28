/*
Indication: Bullish/Bearish reversal
Reliability: Medium

Bearish
Occurring during an uptrend, this pattern characterized by a large black real body, which engulfs a white real body (it doesn't need to engulf the shadows). This signifies that the uptrend has been hurt and the bears may be gaining strength. The Engulfing indicator is also the first two candles of the Three Outside patterns.

Bullish
Description: During a downtrend, the Bullish Engulfing depicts an opening at a new low and closes at or above the previous candle's open. This signifies that the downtrend has lost momentum and the bulls may be gaining strength.
Factors increasing the pattern's effectiveness are:

1) The first candlestick has a small real body and the second has a large real body.
2) Pattern appears after protracted or very fast move.
3) Heavy volume on second real body.
4) The second candlestick engulfs more than one real body.

This happens when price opens lower on the second day than the first day’s close, but price increases throughout the candle, closing higher than the opening of the first candle. The ideal way to trade this pattern (and any pattern) is to wait for confirmation on the following candle that price is continuing up
 */

const isEngulfing = (data) => {
    const { candleA, candleB } = data;
    const gotAllCandlesData = candleA.openPrice && candleB.openPrice;
    if (!gotAllCandlesData) return false;

    const matchSides = candleB.side !== candleA.side;
    if (!matchSides) return false;

    const sizesCandleA = ["small", "medium", "big", "huge"];
    const sizesCandleB = ["tiny", "small", "medium"];
    const matchSizes =
        sizesCandleA.includes(candleA.bodySize) &&
        sizesCandleB.includes(candleB.bodySize);
    if (!matchSizes) return false;

    const { result: isPriorCandleInsideCurr, variant } = handleCandleInsides({
        candleA,
        candleB,
    });
    if (!isPriorCandleInsideCurr) return false;

    return {
        type: "engulfing",
        pressureA: candleA.pressure,
        variant,
    };
};

// HELPERS
function handleCandleInsides({ candleA, candleB }) {
    const isBullishCandleA = candleA.side === "bull";
    let variant = "bull";

    const closeA = candleA.closePrice;
    const openA = candleA.openPrice;
    const closeB = candleB.closePrice;
    const openB = candleB.openPrice;

    let isCloseBInsideA = closeA > closeB && openA < closeB;
    let isOpenBInsideA = closeA > openB && openA < openB;

    if (!isBullishCandleA) {
        isCloseBInsideA = closeA < closeB && openA > closeB;
        isOpenBInsideA = closeA < openB && openA > openB;
        variant = "bear";
    }

    return {
        result: isCloseBInsideA && isOpenBInsideA,
        variant,
    };
}
// END HELPERS

module.exports = isEngulfing;
