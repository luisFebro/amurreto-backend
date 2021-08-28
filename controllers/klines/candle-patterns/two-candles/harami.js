/*
Indication: Bullish/Bearish reversal
Reliability: Low
Description:
The Harami Pattern is characterized by a small white real body contained within a prior relatively long black real body.

'Harami' is old Japanese word for pregnant. The long black candlestick is 'the mother' and the small candlestick is 'the baby'.

The smaller the second candlestick, the stronger is the reversal signal.
The shadows of the second candlestick do not have to be contained within the first candle's body, though it's preferable if they are.
Pattern needs confirmation on the next candlestick.
 */

const isHarami = (data) => {
    const { candleA, candleB } = data;
    const gotAllCandlesData = candleA.openPrice && candleB.openPrice;
    if (!gotAllCandlesData) return false;

    const matchSides = candleB.side !== candleA.side;
    if (!matchSides) return false;

    const sizesCandleA = ["tiny", "small", "medium"];
    const sizesCandleB = ["small", "medium", "big", "huge"];
    const matchSizes =
        sizesCandleA.includes(candleA.bodySize) &&
        sizesCandleB.includes(candleB.bodySize);
    if (!matchSizes) return false;

    const { result: isCurrCandleInsidePrior, variant } = handleCandleInsides({
        candleA,
        candleB,
    });
    if (!isCurrCandleInsidePrior) return false;

    return {
        type: "harami",
        variant,
        pressureA: candleA.pressure,
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

    let isCloseAInsideB = openB > closeA && closeB < closeA;
    let isOpenAInsideB = openB > openA && closeB < openA;

    if (!isBullishCandleA) {
        isCloseAInsideB = openB < closeA && closeB > closeA;
        isOpenAInsideB = openB < openA && closeB >= openA; // equality here is an exception because it does not stumble across other patterns. For example, clash that happens with tweezers and three outside up
        variant = "bear";
    }

    return {
        result: isCloseAInsideB && isOpenAInsideB,
        variant,
    };
}
// END HELPERS

module.exports = isHarami;
