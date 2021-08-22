// CANDLE TYPES
// single candle analysis
const analyseHammer = (data) => {
    const { pressure } = data;
    const { part, perc } = pressure;
    if (perc >= 50 && (part === "lower" || part === "upper")) return true;
    return false;
};

const analyseDoji = (data) => {
    const { upper, body, lower, volRealBody } = data;
    const upperEqual3 = upper.toString().charAt(0) === "3";
    const bodyEqual3 = body.toString().charAt(0) === "3";
    const lowerEqual3 = lower.toString().charAt(0) === "3";

    // high wave doji
    const isHighWave = upperEqual3 && lowerEqual3 && volRealBody > 2000;
    if (isHighWave) return "dojiHighWave";

    return upperEqual3 && bodyEqual3 && lowerEqual3;
};
// end single candle analysis

// 2 candles analysis
const analyseEngulfing = (data) => {};
const analyseTweezers = (data) => {
    const {
        pressure,
        currOpen,
        lastClose,
        isLastCandleBullish,
        // closeHigherThanLastOpen,
    } = data;

    // analyse like if the half of price (base without decimal) is equal like 178.532 and 178.900 is true
    const baseValueLeng = parseInt(currOpen).toString().length;
    const baseValueOpen = parseInt(currOpen)
        .toString()
        .slice(0, Math.round(baseValueLeng / 2));
    const baseValueClose = parseInt(lastClose)
        .toString()
        .slice(0, Math.round(baseValueLeng / 2));
    const isBaseEqual = baseValueOpen === baseValueClose;

    if (isBaseEqual && pressure.part === "body" && isLastCandleBullish)
        return true;
    return false;
};
// end 2 candles analysis
// END CANDLE TYPES

function findCandleTypes({
    price,
    vol,
    pressure,
    lastClose,
    closeHigherThanLastOpen,
    isLastCandleBullish,
}) {
    let oneCandleType = "";
    let twoCandleType = "";
    let threeCandleType = "";

    const defaultData = {
        upper: vol.upperPerc,
        body: vol.bodyPerc,
        lower: vol.lowerPerc,
        isBullish: price.isBullish,
        pressure,
        currOpen: price.open,
        lastClose,
    };

    // single candle
    const volRealBody = vol.volRealBody;
    if (analyseDoji({ ...defaultData, volRealBody }) === "dojiHighWave")
        oneCandleType = "dojiHighWave";
    else if (analyseDoji({ ...defaultData, volRealBody }))
        oneCandleType = "doji";
    if (analyseHammer(defaultData)) oneCandleType = "hammer";
    // end single candle

    // 2 candles
    if (
        analyseTweezers({
            ...defaultData,
            closeHigherThanLastOpen,
            isLastCandleBullish,
        })
    )
        twoCandleType = "tweezers";
    // end 2 candles

    return {
        oneCandleType,
        twoCandleType,
        threeCandleType,
    };
}

module.exports = { findCandleTypes, analyseDoji };
