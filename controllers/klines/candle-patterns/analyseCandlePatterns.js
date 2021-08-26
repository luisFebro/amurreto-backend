const findCandleTypes = require("./allTypes");
const isDoji = require("./one-candle/doji");
const findCandleBodySize = require("./helpers/findCandleBodySize");
const {
    keepSameSequence,
    array,
} = require("../../../utils/array/keepSameSequence");

const candlesDataAnalysis = array;

function analyseCandlePatterns(candleData) {
    const { vol, price } = candleData; // n1 data details

    const candleBodySize = findCandleBodySize(vol);
    const pressure = handleStrength(vol);
    const allData = {
        timestamp: price.timestamp, // for testing only
        isBullish: price.isBullish,
        openPrice: price.open,
        closePrice: price.close,
        bodyPerc: vol.bodyPerc,
        upperPerc: vol.upperPerc,
        lowerPerc: vol.lowerPerc,
        bodySize: candleBodySize,
        pressure,
    };
    keepSameSequence(allData, { maxArray: 3, mostRecent: "last" });

    const { oneCandleType, twoCandleType, threeCandleType } = findCandleTypes({
        candlesDataAnalysis,
    });

    return {
        oneCandleType,
        twoCandleType,
        threeCandleType,
    };
}

// HELPERS
function handleStrength(vol) {
    const { upperPerc: upper, bodyPerc: body, lowerPerc: lower } = vol;
    const isEqual = isDoji({ upper, body, lower });

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

module.exports = analyseCandlePatterns;

/* COMMENTS
n1:
candleData { price:
{ open: 256434.91,
 max: 256587.47,
 min: 252500.24,
 close: 252811.01,
 isBullish: false
 timestamp: date,
 },
vol:
{ baseVol: 153,
 volFullCandle: 4087.23,
 volRealBody: -3623.9,
 bodyPerc: 88.7,
 upperPerc: 3.7,
 lowerPerc: 7.6 } }

*/
