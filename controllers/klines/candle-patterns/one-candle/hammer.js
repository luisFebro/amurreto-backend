/*
This hammer indicates a high selling pressure pushing the price down, but bulls managed to recover all price back which means there's a high volume of buyers read to make the price go up.
It indicates the bulls will soon have control of the market

The longer the lower shadow, the smaller the upper shadow, and the smaller the real body, the more significant the pattern is.
 */

const isHammer = (data) => {
    const { candleA } = data;
    const gotAllCandlesData = candleA.openPrice;
    if (!gotAllCandlesData) return false;

    const sizesCandleA = ["tiny", "small", "medium"];
    const matchSizes = sizesCandleA.includes(candleA.bodySize);
    if (!matchSizes) return false;

    const MAX_OTHER_SIDE = 30;
    const MIN_PRESSURE = 45;
    const checkBullishHammer =
        candleA.pressure.perc >= MIN_PRESSURE &&
        candleA.pressure.part === "lower" &&
        candleA.upperPerc <= MAX_OTHER_SIDE;

    const checkBearishHammer =
        candleA.pressure.perc >= MIN_PRESSURE &&
        candleA.pressure.part === "upper" &&
        candleA.lowerPerc <= MAX_OTHER_SIDE;

    const matchPressure = checkBullishHammer || checkBearishHammer;
    if (!matchPressure) return false;

    const isThorHammer =
        candleA.pressure.part === "lower" && candleA.pressure.perc >= 50;

    const handleVariant = () => {
        if (isThorHammer && candleA.lowerPerc >= 55 && candleA.side === "bull")
            return "soloThor";
        if (isThorHammer) return "thor";
        const isShooting = candleA.upperPerc >= 40 && candleA.side === "bear";
        return isShooting ? "shooting" : "morning";
    };

    return {
        type: "hammer",
        variant: handleVariant(),
        pressureA: candleA.pressure,
    };
};

module.exports = isHammer;
