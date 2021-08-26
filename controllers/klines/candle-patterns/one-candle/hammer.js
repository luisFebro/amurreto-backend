const isHammer = (data) => {
    const { candleA } = data;
    const gotAllCandlesData = candleA.openPrice;
    if (!gotAllCandlesData) return false;

    const matchPressure =
        candleA.pressure.perc >= 50 &&
        (candleA.pressure.part === "lower" ||
            candleA.pressure.part === "upper");
    if (!matchPressure) return false;
    console.log("candleA", candleA);

    return true;
};

module.exports = isHammer;
