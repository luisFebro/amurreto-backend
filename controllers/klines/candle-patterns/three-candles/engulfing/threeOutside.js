const isEngulfing = require("../../two-candles/engulfing");

/*
Indication: Bullish/Bearish reversal

Reliability: High

Description: This pattern is a more reliable addition to the standard Harami pattern.
A bullish Harami pattern occurs in the first two candles.
The third candle is a white candle with a higher close than the second candle and the confirmation of the bullish trend reversal.
https://www.investing.com/crypto/bitcoin/btc-usd-candlestick
 */

const isThreeOutside = (data) => {
    const { candleC, candleB, candleA } = data;

    const gotAllCandlesData =
        candleA.openPrice && candleB.openPrice && candleC.openPrice;
    if (!gotAllCandlesData) return false;

    // detect bear only in the last case with big and huge
    const isCurrBull = candleA.side === "bull";
    const sizesCandleA = isCurrBull ? ["small", "medium"] : ["big", "huge"];
    const matchSizes = sizesCandleA.includes(candleA.bodySize);
    if (!matchSizes) return false;

    const matchEngulfing = isEngulfing({ candleA: candleB, candleB: candleC });
    const variant = matchEngulfing.variant;

    const matchCandleASide = candleA.side === variant;
    if (!matchEngulfing || !matchCandleASide) return false;

    return {
        type: "threeOutside",
        variant: variant === "bull" ? "up" : "down",
        pressureA: candleA.pressure,
    };
};

module.exports = isThreeOutside;
