/*
Pure doji/Spinning Top - A doji candlestick forms when a security's open and close are virtually equal for the given time period and generally signals a reversal pattern for technical analysts. In Japanese, "doji" means blunder or mistake, referring to the rarity of having the open and close price be exactly the same.
Gravestone doji - Bearish reversal candle with a long upper wick and the open/close near the low.
Dragonfly Doji - Either bullish or bearish candle (depending on context) with a long lower wick and the open/close near the high.
Doji indicates indecision in the market.
*/

const isDoji = (data) => {
    const { candleA } = data;

    const gotAllCandlesData = candleA.openPrice;
    if (!gotAllCandlesData) return false;

    const sizesCandleA = ["tiny"];
    const matchSizes = sizesCandleA.includes(candleA.bodySize);
    if (!matchSizes) return false;

    const MIN_PRESSURE = 40;
    const matchPressure = candleA.pressure.perc >= MIN_PRESSURE;
    if (!matchPressure) return false;

    const MAX_BODY = 15;
    const MIN_OTHER_SIDE = 10; // the offset between the close/open and highest/lowest price

    const checkMinBullishDoji =
        candleA.pressure.part === "lower" &&
        candleA.upperPerc >= MIN_OTHER_SIDE;

    const checkMinBearishDoji =
        candleA.pressure.part === "upper" &&
        candleA.lowerPerc >= MIN_OTHER_SIDE;

    const maxDojiBodyPerc = candleA.bodyPerc <= MAX_BODY;
    const matchMinToBeDoji =
        maxDojiBodyPerc && (checkMinBullishDoji || checkMinBearishDoji);

    if (!matchMinToBeDoji) return false;

    // high-wave A big bearish/bullish candle which means reversal and breaks all supports and followed by high waves candles for indecision which will result in a big move next.
    const matchShadows =
        candleA.lowerPerc >= 30 &&
        candleA.lowerPerc <= 59 &&
        candleA.upperPerc >= 30 &&
        candleA.upperPerc <= 59;
    const isHighWave = candleA.bodyPerc <= 2 || matchShadows;

    return {
        type: "doji",
        variant: isHighWave ? "high wave" : "spinning top",
        pressureA: candleA.pressure,
    };
};

module.exports = isDoji;

// const isUpperEqual3 = candleA.upperPerc.toString().charAt(0) === "3";
// const isBodyEqual3 = candleA.bodyPerc.toString().charAt(0) === "3";
// const isLowerEqual3 = candleA.lowerPerc.toString().charAt(0) === "3";
// const isEqual = isUpperEqual3 && isBodyEqual3 && isLowerEqual3;
// console.log("isEqual", isEqual);

// high wave doji
// const isHighWave = upperEqual3 && lowerEqual3 && volRealBody > 2000;
// if (isHighWave) return "dojiHighWave";
