const isHammer = require("../one-candle/hammer");
const isDoji = require("../one-candle/doji");

/*
Bullish morning star / Bearish shooting star
Indication: Bullish Reversal

Reliability: High

Morning star description:
During a downtrend, the market strengthens the bearish trend with a long black candlestick. The second candlestick trades within a small range and closes at or near its open. This scenario generally shows the potential for a rally, as many positions have been changed.
Confirmation of the reversal is given by the white third candlestick.
The stronger the white third body the more significant the pattern is.

Shooting star description:
During an uptrend, the market builds strength on a long white candlestick. The second candlestick trades within a small range and closes at or near its open. This scenario generally shows an erosion of confidence in the current trend. Confirmation of the trend reversal is the black third candlestick.
A gap between the second and the third bodies is not a must.
 */

// improvements: it should have at least two candles either bullish or bearish streak before the 3-candle pattern since one candle can indicate the start and more bearish candle on the way.

const isStar = (data) => {
    const { candleC, candleB, candleA } = data;

    const gotAllCandlesData =
        candleA.openPrice && candleB.openPrice && candleC.openPrice;
    if (!gotAllCandlesData) return false;

    const matchSides = candleC.side !== candleA.side;
    if (!matchSides) return false;

    // detect bear only in the last case with big and huge
    const isCurrBull = candleA.side === "bull";
    const sizesCandleA = isCurrBull
        ? ["small", "medium", "big", "huge"]
        : ["big", "huge"];
    const sizesCandleC = ["small", "medium", "big", "huge"];
    const matchSizes =
        sizesCandleA.includes(candleA.bodySize) &&
        sizesCandleC.includes(candleC.bodySize);
    if (!matchSizes) return false;

    // EXCEPTIONS TO SIZE
    // if tiny size, only if there is a high pressure from the upper.
    const isExceptionalShootingStar =
        candleA.side === "bear" && candleA.pressure.part === "upper";
    if (candleA.bodySize === "tiny" && !isExceptionalShootingStar) return false;

    const isExceptinalCandleC =
        candleC.pressure.part === "lower" && candleC.side === "bull";
    if (candleC.bodySize === "small" && !isExceptinalCandleC) return false;
    // END EXCEPTIONS TO SIZE

    const matchCandleBAnyStarType =
        isHammer({ candleA: candleB }) || isDoji({ candleA: candleB });
    if (!matchCandleBAnyStarType) return false;

    const isMorningStar = candleC.side === "bear" && candleA.side === "bull";
    const variant = isMorningStar ? "morning" : "shooting";

    const matchMorningStarUpperLimit = candleB.upperPerc <= 50;
    if (isMorningStar && !matchMorningStarUpperLimit) return false;
    // it requires to be bearish because still tend to be uptrend
    const isShootingStarCandleB = candleB.side === "bear";
    if (!isMorningStar && !isShootingStarCandleB) return false;

    return {
        type: "star",
        variant,
        pressureB: candleB.pressure, // here it is B instead of A because it is important to know the pressure from this candle to messure better the power of buyers.
    };
};

module.exports = isStar;
