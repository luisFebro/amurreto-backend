/*
lowerWingPrice will be a parameter to detect a merge in price where no other strategy was detect
for instance, if the lowerWingPrice is 172.000 and the price goes to above 174.500 and got at least 2 bullish candles, then we can buy because is probably a missing opportunity from other strategies.
also can be used to determine the support of the current market
 */

async function getLowerWingSignal({ lowerWing20 }) {
    if (!lowerWing20)
        return {
            signal: null,
        };

    const diffCurrPrice = lowerWing20.diffCurrPrice;

    const MAX_PRICE_DIFF = 3000; // this change to 2000
    const MIN_PRICE_DIFF = 1500;
    const isInDetectionRange =
        diffCurrPrice >= MIN_PRICE_DIFF && diffCurrPrice <= MAX_PRICE_DIFF;

    const isCurrBullishStreak = true;

    if (isInDetectionRange && isCurrBullishStreak) {
        return {
            signal: "BUY",
            strategy: "lowerWing20",
            transactionPerc: 100,
        };
    }
    // need a condition to detect if thereis at least 2 bullish candles
    return {
        signal: null,
    };
}

module.exports = getLowerWingSignal;
