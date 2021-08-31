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

    // EAT-ALL VARIANT
    const matchEatAllSequence =
        candleC.side === candleB.side && candleB.side !== candleA.side;

    const sizesEatAllBoth = ["medium", "big", "huge"];
    const matchEatAllSizes =
        sizesEatAllBoth.includes(candleA.bodySize) &&
        sizesEatAllBoth.includes(candleB.bodySize);

    const matchCurrBiggerWholeSize = candleB.wholeSize < candleA.wholeSize;
    if (matchCurrBiggerWholeSize && matchEatAllSequence && matchEatAllSizes) {
        return {
            type: "threeOutsideEatAll",
            variant: candleA.side === "bull" ? "up" : "down",
            pressureA: candleA.pressure,
        };
    }
    // eat-all variant is the last two candles are bullish/bearish followed by a strong candle (medium or up size) and the current candle engulfs the whole candle (from max/min) is greater than previous candle
    // eat-all bullish candle example: BTC/BRL 2021-08-27T20:00:00.000Z / 2021-08-19T21:00:00.000Z
    // eat-all bearish candle example: BTC/BRL 2021-08-26T01:00:00.000Z
    // END EAT-ALL VARIANT

    const sizesCandleA = ["small", "medium", "big", "huge"];
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
