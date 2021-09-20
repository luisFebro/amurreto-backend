/*
Indication: Bullish reversal Reliability: Medium (My own)
Description: Detect a sudden change in a bear streak by detecting a long lower shadow.
The difference from hammer is that it does matter the body size and the prior candles are necessary bearish ones.
The difference from a Freefall is that it this one catchs while in a bearish candle with a high potential of growth.
e.g 2021-09-08T07:00:00.000Z && 2021-09-08T08:00:00.000Z
*/

const isThunderingChange = (data) => {
    const { candleA, candleB, candleC } = data;
    const gotAllCandlesData = candleA.openPrice && candleB.openPrice;
    if (!gotAllCandlesData) return false;

    const matchSides =
        candleC.side === "bear" &&
        candleB.side === "bear" &&
        candleA.side === "bull";
    if (!matchSides) return false;

    const candleASizes = ["small", "medium"];
    const matchSizes = candleASizes.includes(candleA.bodySize);
    if (!matchSizes) return false;

    const matchLowerPerc = candleA.lowerPerc >= 40;
    if (!matchLowerPerc) return false;

    return {
        type: "thunderingChange",
        pressureA: candleA.pressure,
        variant: "bull",
    };
};

module.exports = isThunderingChange;
