const LiveCandleHistory = require("../../../models/LiveCandleHistory");
const LIVE_CANDLE_ID = "612b272114f951135c1938a0";

/*
EMA UPTREND STOP LOSS - if bullish big or huge candle and it is an EMA uptrend, activate it and disable temporarily other sell strategies.

- selling process will follow the follow:
- if isOn and when PROFIT reach 4%, activate all other SELLING RULES. While not reaching this value, deactivate other SELLING strategies
- if not reaching 4%, SELL SIGNAL (emaDownStopLoss) when the liveCandleBody is bearish and size is big or huge.
- note that big or huge is about the half the size of a huge candle. The idea is to give more space to the market fetch more profit opening the gap of the stop loss.

- strategy only used once and recorded in the live-candle-history. The DB should have two variables:
emaUptrendStopLoss: {
    on: true,
    used: false,
}
when 'used' is true, then even if it is an uptrend signal from EMA, just ignore it
 */

async function watchEmaUptrendStopLoss({
    liveCandle = {},
    profitTracker = {},
    dbEmaUptrend = {},
}) {
    const { netPerc, watching } = profitTracker;
    const { emaTrend, candleBodySize, isBullish } = liveCandle;
    const { on, enableNextUptrend } = dbEmaUptrend;

    const candleSizesAllowed = ["big", "huge"];
    const matchSizeInUptrend = candleSizesAllowed.includes(candleBodySize);

    // ACTIVATION
    const condActivation =
        watching && emaTrend === "uptrend" && matchSizeInUptrend && isBullish;
    if (condActivation) {
        await toggleActivation(true);
    }
    // END ACTIVATION

    // VERIFICATION AND REACTIVATION
    // - when bear or bearReversal, activate the enableNextUptrend again so that we can execute once per uptrend
    const condReactivation =
        !on && (emaTrend === "bearReversal" || emaTrend === "bear");
    if (condReactivation) {
        await LiveCandleHistory.findByIdAndUpdate(LIVE_CANDLE_ID, {
            "emaUptrendStopLoss.enableNextUptrend": true,
        });
    }

    if (!enableNextUptrend) {
        return {
            turnOtherStrategiesOff: false,
        };
    }
    // END VERIFICATION AND REACTIVATION

    const MAX_RANGE_EMA_PROFIT_PERC = 4;
    const isWithinEmaRange = netPerc <= MAX_RANGE_EMA_PROFIT_PERC;
    const turnOtherStrategiesOn = on && !isWithinEmaRange;

    const sellingSizes = ["big", "huge"];
    const needSelling =
        on &&
        !isBullish &&
        isWithinEmaRange &&
        sellingSizes.includes(candleBodySize);

    if (needSelling || turnOtherStrategiesOn) {
        await toggleActivation(false);
    }

    if (needSelling) {
        return {
            turnOtherStrategiesOff: true,
            sellSignal: {
                signal: "SELL",
                strategy: "emaDownStopLoss",
                transactionPerc: 100,
            },
        };
    }

    if (on) {
        return {
            turnOtherStrategiesOff: true,
            sellSignal: false,
        };
    }

    return {
        turnOtherStrategiesOff: false,
        sellSignal: false,
    };
}

// HELPERS
async function toggleActivation(isOn = false) {
    await LiveCandleHistory.findByIdAndUpdate(LIVE_CANDLE_ID, {
        "emaUptrendStopLoss.on": isOn ? true : false,
        "emaUptrendStopLoss.enableNextUptrend": false,
    });
}
// END HELPERS

module.exports = watchEmaUptrendStopLoss;
