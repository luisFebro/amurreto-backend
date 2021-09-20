async function getEmaSignal({ emaTrend, currStrategy, profitTracker }) {
    const isUptrend = emaTrend === "uptrend" || emaTrend === "bullReversal";
    if (isUptrend) {
        return {
            signal: "BUY",
            strategy: "emaUptrend",
            transactionPerc: 100,
        };
    }

    // only sell with ema if the current strategy is also bought with EMA.
    // !isUptrend can be either bearReversal or downtrend

    // it needs a verifier to warn the uptrend was already taken otherwise it will negotiate again with a right risky of downtrend.
    // const maxPerc = profitTracker && profitTracker.maxPerc;
    // const diffMax = profitTracker && profitTracker.diffMax;
    const isDesirableProfit = false; //maxPerc >= 5 && diffMax >= 1;
    if (currStrategy === "emaUptrend" && (!isUptrend || isDesirableProfit)) {
        return {
            signal: "SELL",
            strategy: "emaDowntrend",
            transactionPerc: 100,
        };
    }

    // empty signal handle with strategiesManager
    return { signal: null };
}

module.exports = getEmaSignal;
