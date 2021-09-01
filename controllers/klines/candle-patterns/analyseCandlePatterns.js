// auto patterns recognition
const findCandleTypes = require("./allTypes");
const keepSameSequence = require("../../../utils/array/keepSameSequence");

const candlesDataAnalysis = [];

function analyseCandlePatterns(candleData) {
    const { vol, price, candleBodySize } = candleData; // n1 data details

    const pressure = handleStrength(vol);

    const allData = {
        timestamp: price.timestamp,
        marketVol: vol.marketVol,
        side: price.isBullish ? "bull" : "bear",
        openPrice: price.open,
        closePrice: price.close,
        bodyPerc: vol.bodyPerc,
        upperPerc: vol.upperPerc,
        lowerPerc: vol.lowerPerc,
        bodySize: candleBodySize,
        wholeSize: vol.wholeCandleSize, // including max/min
        pressure,
    };
    keepSameSequence(allData, { maxArray: 3, array: candlesDataAnalysis });

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
    const { upperPerc, bodyPerc, lowerPerc } = vol;

    const isUpperEqual3 = upperPerc.toString().charAt(0) === "3";
    const isBodyEqual3 = bodyPerc.toString().charAt(0) === "3";
    const isLowerEqual3 = lowerPerc.toString().charAt(0) === "3";
    const isEqual = isUpperEqual3 && isBodyEqual3 && isLowerEqual3;

    const maxPerc = Math.max(...[upperPerc, bodyPerc, lowerPerc]);

    if (isEqual) {
        return {
            part: "equal",
            perc: maxPerc,
        };
    }

    const options = {
        [upperPerc]: "upper",
        [bodyPerc]: "body",
        [lowerPerc]: "lower",
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
{ marketVol: 153,
 volRealBody: -3623.9,
 bodyPerc: 88.7,
 upperPerc: 3.7,
 lowerPerc: 7.6 } }

*/
