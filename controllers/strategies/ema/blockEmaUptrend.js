const LiveCandleHistory = require("../../../models/LiveCandleHistory");
const LIVE_CANDLE_ID = "613ed80dd3ce8cd2bbce76cb";
// every uptrend should be executed once.
// to avoid further triggers to the uptrend ema in the same trend, it should be blocked if other selling strategy is activated until reach the next bearReversal or downtrend.

async function blockEmaUptrend(action, toggle) {
    const allowedActions = ["read", "toggle"];
    if (!allowedActions.includes(action)) throw new Error("invalid action");

    if (action === "read") {
        const data = await LiveCandleHistory.findById(LIVE_CANDLE_ID).select(
            "-_id emaBlockUptrend"
        );
        return data && data.emaBlockUptrend;
    }

    if (action === "toggle") {
        const updateThis = {
            emaBlockUptrend: toggle,
        };

        await LiveCandleHistory.findByIdAndUpdate(LIVE_CANDLE_ID, updateThis);
        return "done toggle";
    }

    return "done";
}

module.exports = blockEmaUptrend;
