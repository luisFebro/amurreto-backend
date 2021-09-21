const { IS_DEV } = require("../../../../config");
/*
Indication: Bullish reversal
Reliability: Medium (My own)
Description: Detect a plummet (fall or drop straight down at high speed.) in the market. Two heavily bullish candle with a gap in the lower shadow indicates a huge profit opportunity.
e.g 2021-09-07T14:00:00.000Z && 2021-09-07T15:00:00.000Z
 */

const isFreeFall = (data) => {
    const { candleA, candleB } = data;
    const gotAllCandlesData = candleA.openPrice && candleB.openPrice;
    if (!gotAllCandlesData) return false;

    // note that backtesting will not detect a bear candleA. That's why we don't detect a side when backtesting
    const pickSide = IS_DEV ? true : candleA.side === "bear";
    const matchSides = candleB.side === "bear" && pickSide;
    if (!matchSides) return false;
    const sizesCandleB = ["tiny", "small", "medium", "big", "huge"];
    const matchSizes = sizesCandleB.includes(candleB.bodySize);
    if (!matchSizes) return false;

    const matchWholeCandleSizes =
        candleA.wholeSize >= 10000 ||
        (candleB.wholeSize >= 8000 && candleA.wholeSize >= 8000);
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
