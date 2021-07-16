const { findCandleTypes, analyseDoji } = require("./candleTypes");
const findCandleBodySize = require("./algo/findCandleBodySize");

const candlesDataAnalysis = [];
const sequenceSides = [];

function analyseCandle(candleData) {
    const { vol, price } = candleData;
    const { volRealBody, close, isBullish } = price;

    const lastCandleData = candlesDataAnalysis.length
        ? candlesDataAnalysis.slice(-1)[0]
        : [];
    const isLastCandleBullish = lastCandleData.price
        ? lastCandleData.price.isBullish
        : null;
    const lastCandleOpen = lastCandleData.price
        ? lastCandleData.price.open
        : null;
    const lastClose = lastCandleData.price ? lastCandleData.price.close : null;
    const closeHigherThanLastOpen = lastCandleOpen
        ? lastCandleOpen < close
        : null;

    sequenceSides.push(isBullish ? "bull" : "bear");
    candlesDataAnalysis.push(candleData);

    const pressure = handleStrength(vol);
    const candleTypes = findCandleTypes({
        ...candleData,
        pressure,
        volRealBody,
        lastClose,
        closeHigherThanLastOpen,
        isLastCandleBullish,
    });

    return {
        candleTypes: JSON.stringify(candleTypes),
        candleBodySize: findCandleBodySize(vol),
        closeHigherThanLastOpen,
        lastSequenceRange: JSON.stringify(sequenceSides.slice(-3)),
        pressure: JSON.stringify(pressure),
    };
}

// HELPERS
function handleStrength(vol) {
    const { upperPerc: upper, bodyPerc: body, lowerPerc: lower } = vol;
    const isEqual = analyseDoji({ upper, body, lower });

    const maxPerc = Math.max(...[upper, body, lower]);

    if (isEqual) {
        return {
            part: "equal",
            perc: maxPerc,
        };
    }

    const options = {
        [upper]: "upper",
        [body]: "body",
        [lower]: "lower",
    };

    return {
        part: options[maxPerc],
        perc: maxPerc,
    };
}
// END HELPERS

module.exports = analyseCandle;
