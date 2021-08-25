// STRATEGIES shoulb be moved to watchStrategies.
/*
SIGNALS
BUY, HOLD, SELL, WAIT, ? (unknown)

SELL STRATEGIES
1. rsiOverbought - sell 50% of capital when the current bull run is overbought (70).
2. emaBear9over20 - sell 50%/100% when the 9-period EMA crosses ABOVE the 20-period EMA and has at least X pips of difference.

BUY STRATEGIES
1. emaBull9over20 - buy 100% when the 9-period EMA crosses ABOVE the 20-period EMA and has at least X pips of difference.

HOLD STRATEGIES
1. emaBull9over20 - hold/buy 100% when the 9-period EMA is above 20 and 50-period EMA.

WAIT STRATEGIES
1. waitEma - no position when 9-period is below 20 and 50-period EMA. This is a bearish trend.

NOTES
a) if a transactionPerc has already been made and it is 50% and next is 100% in the same side like SELL,
the createOrderBySignal method will verify the current SELL/BUY ratio and adjust from 100% to 50% to match a 50%/50% ratio
- if no transaction was made in the current side, then use the transactionPerc of the signal below

b) the strategy is saved on DB, and the same strategy will not be executed more than once in the row.
the system verifies the last strategy and side and if it is the same as the current, does not allow to run again.

c) each strategy should be executed only ONE TIME per trade. The algo will verify if current strategy was already ran and prevent it to be executed again.
*/

function analyseSignals({ emaTrend, isOverbought }) {
    if (!emaTrend) return "?";

    if (isOverbought) null;
    // it is temporary disable to watch out only EMA at first, then implement it
    // if (isOverbought)
    //     return {
    //         signal: "SELL",
    //         strategy: "rsiOverbought",
    //         transactionPerc: 50,
    //     };

    if (emaTrend === "bullReversal")
        return {
            signal: "BUY",
            strategy: "emaBull9over20",
            transactionPerc: 100,
        };
    if (emaTrend === "bearReversal")
        return {
            signal: "SELL",
            strategy: "emaBear9over20",
            transactionPerc: 100,
        };
    if (emaTrend === "uptrend")
        return {
            signal: "HOLD",
            strategy: "emaBull9over20",
            transactionPerc: 100,
        };

    return {
        signal: "WAIT",
        strategy: "waitEma",
        transactionPerc: 100,
    };
}

module.exports = analyseSignals;
