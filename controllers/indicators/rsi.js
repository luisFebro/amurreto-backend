/*
The relative strength index (RSI) is a momentum indicator used in technical analysis that measures the magnitude of recent price changes to evaluate overbought or oversold conditions in the price of a stock or other asset. The RSI is displayed as an oscillator (a line graph that moves between two extremes) and can have a reading from 0 to 100. The indicator was originally developed by J. Welles Wilder Jr. and introduced in his seminal 1978 book, “New Concepts in Technical Trading Systems.”

Traditional interpretation and usage of the RSI are that values of 70 or above indicate that a security is becoming overbought or overvalued and may be primed for a trend reversal or corrective pullback in price. An RSI reading of 30 or below indicates an oversold or undervalued condition.

An asset is usually considered overbought when the RSI is above 70% and oversold when it is below 30%.

INTERPRETATION - During an uptrend, the RSI tends to stay above 30 and should frequently hit 70. During a downtrend, it is rare to see the RSI exceed 70, and the indicator frequently hits 30 or below.
These guidelines can help determine trend strength and spot potential reversals. For example, if the RSI can’t reach 70 on a number of consecutive price swings during an uptrend, but then drops below 30, the trend has weakened and could be reversing lower.
The opposite is true for a downtrend. If the downtrend is unable to reach 30 or below and then rallies above 70, that downtrend has weakened and could be reversing to the upside. Trend lines and moving averages are helpful tools to include when using the RSI in this way.

In an uptrend or bull market, the RSI tends to remain in the 40 to 90 range with the 40-50 zone acting as support. During a downtrend or bear market the RSI tends to stay between the 10 to 60 range with the 50-60 zone acting as resistance. These ranges will vary depending on the RSI settings and the strength of the security’s or market’s underlying trend.

RSI DIVERGENCE
- A bullish divergence occurs when the RSI creates an oversold reading followed by a higher low that matches correspondingly lower lows in the price. This indicates rising bullish momentum, and a break above oversold territory could be used to trigger a new long position.
- A bearish divergence occurs when the RSI creates an overbought reading followed by a lower high that matches corresponding higher highs on the price.
https://www.investopedia.com/terms/r/rsi.asp

 */

// For 14-period RSI calculation you need closing prices of the last 15 days
//  To exactly replicate our RSI numbers, a formula will need at least 250 data points.
function calculateRSI(array, options = {}) {
    const { period = 15, candlesCount } = options;
    if (candlesCount < period) return [];

    const rsiList = [];
    const avgGainList = [];
    const avgLossList = [];

    const targetRanges = findRanges(array, period);
    targetRanges.forEach((range, ind) => {
        const { RS, currGains, currLosses } = getRelativeStrength(range, {
            period,
        });

        if (ind === 0) {
            const initialRSI = 100 - 100 / (1 + RS);
            avgGainList.push(currGains);
            avgLossList.push(currLosses);

            rsiList.push(Number(initialRSI.toFixed(2)));
            return;
        }

        const priorAvgGain = avgGainList.slice(-1)[0];
        const priorAvgLoss = avgLossList.slice(-1)[0];

        // The second step of the calculation smooths the results.
        const ultimateAvgGains =
            (priorAvgGain * (period - 1) + currGains) / period;
        const ultimateAvgLosses =
            (priorAvgLoss * (period - 1) + currLosses) / period;
        const ultimateRS = ultimateAvgGains / ultimateAvgLosses;
        const rsi = 100 - 100 / (1 + ultimateRS);

        avgGainList.push(ultimateAvgGains);
        avgLossList.push(ultimateAvgLosses);
        rsiList.push(Number(rsi.toFixed(2)));
    });

    return rsiList;
}

module.exports = calculateRSI;

// HELPERS
function getRelativeStrength(lastCloseDays, options = {}) {
    // n1
    const { period } = options;

    const earnings = [];
    const losses = [];
    let lastClose = 0;

    // if 14-period rsi, then need 15 days so that we can the the first in the row the last first last price.
    lastCloseDays.forEach((currClose, ind) => {
        const isFirst = ind === 0;
        if (isFirst) return (lastClose = currClose);
        // If the last close is the same as the previous, both U and D are zero.
        const computedRes =
            lastClose === 0 || lastClose === currClose
                ? 0
                : currClose - lastClose;
        const isLoss = computedRes < 0;

        if (isLoss) losses.push(Math.abs(computedRes));
        else earnings.push(computedRes);

        lastClose = currClose;
        return null;
    }, 0);

    const currGains = earnings.reduce((acc, next) => acc + next, 0);
    const currLosses = losses.reduce((acc, next) => acc + next, 0);
    const avgU = currGains / period; // average of all up moves in the last N price bars
    const avgD = currLosses / period; // average of all down moves in the last N price bars

    const rs = avgU / avgD;

    return {
        RS: rs,
        currGains,
        currLosses,
    };
}

function findRanges(data, period = 15) {
    const middleElemInd = Math.floor(data.length / 2) + 1;

    const list = [];
    let lastCount = "";
    data.forEach((x, ind) => {
        const currCount = data[middleElemInd + ind];
        if (currCount === lastCount) return;
        const lastCloses = data.slice(0 + ind, middleElemInd + ind);
        const thisRange = lastCloses.slice(-period);
        list.push(thisRange);
        lastCount = currCount;
    });

    return list;
}
// END HELPERS

/* COMMENTS
// The RSI is computed with a two-part calculation that starts with the following formula:
// The average gain or loss used in the calculation is the average percentage gain or loss during a look-back period. The formula uses a positive value for the average loss.
// The RSI will rise as the number and size of positive closes increase, and it will fall as the number and size of losses increase. The second part of the calculation smooths the result, so the RSI will only near 100 or 0 in a strongly trending market.

n1:
First, calculate the bar-to-bar changes for each bar: Chng = Closet – Closet-1
if diff is POSITIVE:
a) Closet – Closet-1 if the price change is positive
b) Zero if the price change is negative or zero
if diff is NEGATIVE:
a) The absolute value of Closet – Closet-1 if the price change is negative
b) Zero if the price change is positive or zero
https://www.macroption.com/rsi-calculation/
*/
