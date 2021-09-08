/*
Indication: Bullish reversal
Reliability: Medium (My own)
Description: Two heavily bullish candle with a gap in the lower shadow indicates a huge profit opportunity.
e.g 2021-09-07T14:00:00.000Z && 2021-09-07T15:00:00.000Z
 */

const isFreeFall = (data) => {
    const { candleA, candleB } = data;
    const gotAllCandlesData = candleA.openPrice && candleB.openPrice;
    if (!gotAllCandlesData) return false;

    const matchSides = candleB.side === "bear";
    if (!matchSides) return false;
    const sizesCandleB = ["medium", "big", "huge"];
    const matchSizes = sizesCandleB.includes(candleB.bodySize);
    if (!matchSizes) return false;

    const matchWholeCandleSizes = candleA.wholeSize >= 10000; // candleB.wholeSize >= 7000 &&
    if (!matchWholeCandleSizes) return false;

    const matchMinLowerPerc = candleA.lowerPerc >= 25;
    if (!matchMinLowerPerc) return false;

    return {
        type: "freeFall",
        pressureA: candleA.pressure,
        variant: "bear",
    };
};

module.exports = isFreeFall;
