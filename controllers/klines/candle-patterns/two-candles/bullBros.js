/* Bull Bros (my own)
Indication: Bullish continuation
Reliability: Medium

track continuation bullish moves with 2 bullish candles side by side.
works like a coverage and fallback strategy when others failed to track pump movement in price.

 */

const areBullBros = (data) => {
    const { candleA, candleB } = data;

    const gotAllCandlesData = candleA.openPrice && candleB.openPrice;
    if (!gotAllCandlesData) return false;

    const matchSides = candleB.side === "bull" && candleA.side === "bull";
    if (!matchSides) return false;

    const sizesCandleA = ["small", "medium", "big", "huge"];
    const matchSizes = sizesCandleA.includes(candleA.bodySize);
    if (!matchSizes) return false;

    return {
        type: "broBulls",
        variant: "bullish",
        pressureA: candleA.pressure,
    };
};

module.exports = areBullBros;
