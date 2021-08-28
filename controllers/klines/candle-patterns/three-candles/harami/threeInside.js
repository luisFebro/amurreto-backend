const isHarami = require("../../two-candles/harami");

/*
Indication: Bullish/Bearish reversal
Reliability: High
Description: This pattern is a more reliable addition to the standard Harami pattern.
A bullish Harami pattern occurs in the first two candles.
The third candle is a white candle with a higher close than the second candle and the confirmation of the bullish trend reversal.
https://www.investing.com/crypto/bitcoin/btc-usd-candlestick
 */

const isThreeInside = (data) => {
    const { candleC, candleB, candleA } = data;

    const gotAllCandlesData =
        candleA.openPrice && candleB.openPrice && candleC.openPrice;
    if (!gotAllCandlesData) return false;

    const sizesCandleA = ["small", "medium", "big", "huge"];
    const matchSizes = sizesCandleA.includes(candleA.bodySize);
    if (!matchSizes) return false;

    const matchHarami = isHarami({ candleA: candleB, candleB: candleC });
    const variant = matchHarami.variant;

    const matchCandleASide = candleA.side === variant;
    if (!matchHarami || !matchCandleASide) return false;

    return {
        type: "threeInside",
        variant: variant === "bull" ? "up" : "down",
        pressureA: candleA.pressure,
    };
};

module.exports = isThreeInside;
