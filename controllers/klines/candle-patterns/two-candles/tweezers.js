// tweezers bottom occurs when two candles, back to back, occur with very similar lows or lower real body. The pattern is more important when there is a strong shift in momentum between the first candle and the second.

const areTweezers = (data) => {
    const { candleA, candleB } = data;

    const gotAllCandlesData = candleA.openPrice && candleB.openPrice;
    if (!gotAllCandlesData) return false;

    const matchSides = candleB.side === "bear" && candleA.side === "bull";
    if (!matchSides) return false;

    const sizesCandleA = ["medium", "big", "huge"];
    const sizesCandleB = ["small", "medium", "big", "huge"];
    const matchSizes =
        sizesCandleA.includes(candleA.bodySize) &&
        sizesCandleB.includes(candleB.bodySize);
    if (!matchSizes) return false;

    const openA = candleA.openPrice;
    const closeB = candleB.closePrice;
    const MAX_DIFF = 45;
    const matchSimilarPrices =
        Math.abs(openA - closeB) <= MAX_DIFF && closeB <= openA;
    if (!matchSimilarPrices) return false;

    return {
        type: "tweezers",
        variant: "bullish",
        pressureA: candleA.pressure,
    };
};

module.exports = areTweezers;
