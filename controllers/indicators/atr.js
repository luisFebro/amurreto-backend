const getIncreasedPerc = require("../../utils/number/perc/getIncreasedPerc");
/*
The average true range (ATR) is a technical analysis indicator, introduced by market technician J. Welles Wilder Jr. in his book New Concepts in Technical Trading Systems, that measures market volatility by decomposing the entire range of an asset price for that period

The true range indicator is taken as the greatest of the following: current high less the current low; the absolute value of the current high less the previous close; and the absolute value of the current low less the previous close. The ATR is then a moving average, generally using 14 days, of the true ranges.

High ATR values usually result from a sharp advance or decline and are unlikely to be sustained for extended periods.
A low ATR value indicates a series of periods with small ranges (quiet days). These low ATR values are found during extended sideways price action, thus the lower volatility. A prolonged period of low ATR values may indicate a consolidation area and the possibility of a continuation move or reversal.
The initial 14-period average true range value is calculated using the method explained above.

A sharp decline or rise results in high average true range values. The high values are generally not maintained for long.
If the average true range value remains low for some time, it may indicate the possibility of a reversal or continuation move and an area of consolidation.
The multiple of average true range, for example, 1.5 * average true range value, can be used to track the abnormal price movements.
 */

function calculateATR(array, options = {}) {
    const { period = 14, candlesCount } = options;
    if (candlesCount < period) return [{ atr: null, incVolat: null }];

    const atrList = [];

    array.slice(candlesCount).forEach((currCandle, ind) => {
        const lastClose = array[candlesCount + ind - 1].close;
        const currTR = getCurrentTR(currCandle, lastClose);

        const initialAtr = Number(currTR.toFixed(2));
        if (ind === 0)
            return atrList.push({
                atr: initialAtr,
            });

        const priorATR = atrList.slice(-1)[0].atr;
        const atr = Number(getATR({ currTR, period, priorATR }).toFixed(2));
        return atrList.push({
            atr,
            incVolat: getIncreasedPerc(priorATR, atr) || 0,
        });
    });

    return atrList;
}

function getATR({ currTR, priorATR, period }) {
    return (priorATR * (period - 1) + currTR) / period;
}

function getCurrentTR(candle, lastClose) {
    const currHighest = candle.highest;
    const currLowest = candle.lowest;
    /*
    The True Range for today is the greatest of the following:

    Today's high minus today's low
    The absolute value of today's high minus yesterday's close
    The absolute value of today's low minus yesterday's close
     */
    const trCurr = currHighest - currLowest;
    const trHighLastClose = Math.abs(currHighest - lastClose);
    const trLowLastClose = Math.abs(currLowest - lastClose);
    return Math.max(trCurr, trHighLastClose, trLowLastClose);
}

module.exports = calculateATR;
