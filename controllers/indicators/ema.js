/*
The EMA is a type of weighted moving average (WMA) that gives more weighting or importance to recent price data
Since new data carries greater weight, the EMA responds more quickly to price changes than the SMA does.

Computing the EMA involves applying a multiplier to the simple moving average (SMA).
In the end the Exponential Moving Average (EMA) is just an improved version of the Simple Moving Average (SMA) which allows you to look at the average with more importance on recent price changes.
Also, the shorter the time period, the more heavily the most recently data will be weighted.

In an uptrend or bull market, the RSI tends to remain in the 40 to 90 range with the 40-50 zone acting as support. During a downtrend or bear market the RSI tends to stay between the 10 to 60 range with the 50-60 zone acting as resistance. These ranges will vary depending on the RSI settings and the strength of the security’s or market’s underlying trend.
*/

function calculateEMA(array, options = {}) {
    // n1 - requires the double of data so that every current price can have historical data
    const { period, listOnly, candlesCount = 50 } = options;
    const dataLeng = array.length;
    if (dataLeng < candlesCount) return listOnly ? [] : 0;

    const currPrice = array[period]; // fetch price right in the middle
    const currPriceInd = array.indexOf(currPrice) + 1;
    if (!currPriceInd) return listOnly ? [] : 0;

    const emaList = [];

    // const moreWeight = period === 20 || period === 50 ? 0 : 0;
    array.slice(candlesCount).forEach((currPrice, ind) => {
        if (ind === 0) {
            const thisRange = array.slice(0, currPriceInd - 1);
            const sma = getSMA(thisRange, period);
            return emaList.push(Number(sma.toFixed(2)));
        }

        const priorEMA = emaList.slice(-1)[0];
        const ema = getEMA({ period, closePrice: currPrice, priorEMA });
        return emaList.push(Number(ema.toFixed(2))); // + moreWeight
    });

    if (listOnly) return emaList;
    return getLastValueInArray(emaList);
}

function analyseEmaTrend({ ema9, ema20, ema50 }) {
    const isUpTrend = ema9 > ema20 && ema9 > ema50;
    if (isUpTrend) return "uptrend";

    const isDownTrend = ema9 < ema20 && ema9 < ema50;
    if (isDownTrend) return "downtrend";

    const diffEma9to20 = Math.abs(ema9 - ema20);
    const isUpwardReversal = ema9 > ema20 && diffEma9to20 > 200;
    if (isUpwardReversal) return "bullReversal";

    const isDownwardReversal = ema9 < ema20 && diffEma9to20;
    if (isDownwardReversal) return "bearReversal";

    return "downtrend";
}

// HELPERS
function getSMA(targetRange, period) {
    const sum = targetRange.reduce((acc, next) => acc + next, 0);
    return sum / period;
}

function getEMA({ period, closePrice, priorEMA }) {
    // https://www.thebalance.com/simple-exponential-and-weighted-moving-averages-1031196
    // https://sciencing.com/calculate-exponential-moving-averages-8221813.html
    const multiplier = 2 / (period + 1); // weighting factor for the EMA
    return (closePrice - priorEMA) * multiplier + priorEMA;
}

function getLastValueInArray(array) {
    return Number(array.slice(-1)[0].toFixed(2));
}
// END HELPERS

/* COMMENTS
n1:
const currPrice = 500;
const array = [1, 2, 3, 4, 500, 6, 7, 8, 9, 10];
targetRange [ 1, 2, 3, 4, 500 ]
targetRange [ 2, 3, 4, 500, 6 ]
targetRange [ 3, 4, 500, 6, 7 ]
targetRange [ 4, 500, 6, 7, 8 ]
targetRange [ 500, 6, 7, 8, 9 ]
*/

module.exports = { calculateEMA, analyseEmaTrend };
