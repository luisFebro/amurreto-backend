/*
Indication: Bullish reversal
Reliability: Low
Description:
The Harami Bullish Pattern is characterized by a small white real body contained within a prior relatively long black real body.

'Harami' is old Japanese word for pregnant. The long black candlestick is 'the mother' and the small candlestick is 'the baby'.

The smaller the second candlestick, the stronger is the reversal signal.
The shadows of the second candlestick do not have to be contained within the first candle's body, though it's preferable if they are.
Pattern needs confirmation on the next candlestick.
 */

const isHarami = (data) => {
    const { candleA, candleB } = data;
    const gotAllCandlesData = candleA.openPrice && candleB.openPrice;
    if (!gotAllCandlesData) return false;

    const matchSides =
        candleB.side === "bear" &&
        (candleA.side === "bull" || candleA.side === "bear");
    if (!matchSides) return false;

    const sizesCandleA = ["tiny", "small", "medium"];
    const sizesCandleB = ["small", "medium", "big", "huge"];
    const matchSizes =
        sizesCandleA.includes(candleA.bodySize) &&
        sizesCandleB.includes(candleB.bodySize);
    if (!matchSizes) return false;

    const closeA = candleA.closePrice;
    const openA = candleA.openPrice;
    const closeB = candleB.closePrice;
    const openB = candleB.openPrice;
    const isCloseAInsideB = openB > closeA && closeB < closeA;
    const isOpenAInsideB = openB > openA && closeB < openA;
    const isCurrCandleInsidePrior = isCloseAInsideB && isOpenAInsideB;
    if (!isCurrCandleInsidePrior) return false;

    return {
        type: "harami",
        pressureA: candleA.pressure,
    };
};

module.exports = isHarami;
