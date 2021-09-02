/*
lowerWingPrice will be a parameter to detect a merge in price where no other strategy was detect
for instance, if the lowerWingPrice is 172.000 and the price goes to above 174.500 and got at least 2 bullish candles, then we can buy because is probably a missing opportunity from other strategies.
also can be used to determine the support of the current market
 */

async function getLowerWingSignal({ lowerWing20, sequenceStreaks }) {
    if (!lowerWing20)
        return {
            signal: null,
        };

    const diffCurrPrice = lowerWing20.diffCurrPrice;
    console.log("sequenceStreaks", sequenceStreaks);
    console.log("diffCurrPrice", diffCurrPrice);

    const MAX_PRICE_DIFF = 2500;
    const MIN_PRICE_DIFF = 1500;
    const isInDetectionRange =
        diffCurrPrice >= MIN_PRICE_DIFF && diffCurrPrice <= MAX_PRICE_DIFF;

    // e.g if bulls it means at least the last 2 candles are bullish - A.bulls.10|B.bears.2|C.bears.2|D.bulls.6|
    const isCurrBullishStreak = sequenceStreaks.includes("A.bulls");

    if (isInDetectionRange && isCurrBullishStreak) {
        return {
            signal: "BUY",
            strategy: "lowerWing20",
            transactionPerc: 100,
        };
    }

    return {
        signal: null,
    };
}

module.exports = getLowerWingSignal;
