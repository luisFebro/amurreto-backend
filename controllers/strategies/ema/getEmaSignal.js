const blockEmaUptrend = require("./blockEmaUptrend");

async function getEmaSignal({ liveCandle, currStrategy, profitTracker }) {
    const { emaTrend, isBullish } = liveCandle;

    const isUptrend = emaTrend === "uptrend" || emaTrend === "bullReversal";
    const isBlock = await blockEmaUptrend("read");
    if (!isBlock && isUptrend && isBullish) {
        return {
            signal: "BUY",
            strategy: "emaUptrend",
            transactionPerc: 100,
        };
    }

    const downtrendList = ["downtrend", "bearReversal"];
    const needUnlockUptrendSignal = isBlock && downtrendList.includes(emaTrend);
    if (needUnlockUptrendSignal) await blockEmaUptrend("toggle", false);

    if (currStrategy === "emaUptrend" && !isUptrend) {
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
