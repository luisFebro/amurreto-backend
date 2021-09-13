const LiveCandleHistory = require("../../../models/LiveCandleHistory");
// const LIVE_CANDLE_ID = "613ed80dd3ce8cd2bbce76cb";

// NOW HANDLING WITH ATR AND EMA TO CHECK PROFIT RANGE IN WATCHSTRATEGIES...
/*
EMA UPTREND STOP LOSS - if bullish big or huge candle and it is an EMA uptrend, activate it and disable temporarily other sell strategies.

- selling process will be the following:
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

    // VERIFICATION AND REACTIVATION
    // - this should be before !watching check.
    // - when bear or bearReversal, activate the enableNextUptrend again so that we can execute once per uptrend
    // on === false is true only in PROD where
    const condReactivation =
        on === false &&
        (emaTrend === "bearReversal" || emaTrend === "downtrend");
    if (condReactivation) {
        await LiveCandleHistory.findByIdAndUpdate(LIVE_CANDLE_ID, {
            "emaUptrendStopLoss.enableNextUptrend": true,
        });
    }

    // if enableNextUptrend, it means it can be activate in the current uptrend.
    // Otherwise, it will only be activated when there is an bearReversal or downtrend again. So that we can use it once once for uptrend
    if (enableNextUptrend) {
        return {
            turnOtherStrategiesOff: false,
            sellSignal: false,
        };
    }
    // END VERIFICATION AND REACTIVATION

    if (!watching) {
        return {
            turnOtherStrategiesOff: false,
            sellSignal: false,
        };
    }

    // this is about the candleSizesAllowed...
    const candleSizesAllowed = ["big", "huge"];
    const matchSizeInUptrend = candleSizesAllowed.includes(candleBodySize);

    // ACTIVATION
    const condActivation =
        watching &&
        enableNextUptrend &&
        emaTrend === "uptrend" &&
        matchSizeInUptrend &&
        isBullish;
    if (condActivation) {
        await toggleActivation(true);
    }
    // END ACTIVATION

    const MAX_RANGE_EMA_PROFIT_PERC = 3;
    const isWithinEmaRange = netPerc <= MAX_RANGE_EMA_PROFIT_PERC;
    const turnOtherStrategiesOn = on && !isWithinEmaRange;

    const sellingSizes = ["big", "huge"];
    const reachedMinGain = on && netPerc <= 0.3; // even if the bullish candle fail abrutly, make sure take some profit and be in the positive
    const needSelling =
        (on &&
            !isBullish &&
            isWithinEmaRange &&
            sellingSizes.includes(candleBodySize)) ||
        reachedMinGain;

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
