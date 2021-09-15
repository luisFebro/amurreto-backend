const LiveCandleHistory = require("../../models/LiveCandleHistory");
const LIVE_CANDLE_ID = "613ed80dd3ce8cd2bbce76cb";

const partialFilled = {
    read: async () => {
        // it is safe using destructing, always return object
        const {
            pendingLimitOrder: { partialFilled },
        } = await LiveCandleHistory.findById(LIVE_CANDLE_ID).select(
            "-_id pendingLimitOrder.partialFilled"
        );
        const foundPartialFilled = partialFilled.marketPrice
            ? partialFilled
            : false;
        if (!foundPartialFilled) return false;
        return foundPartialFilled;
    },
    update: async ({ lastHistory, currHistory }) => {
        const history = [...lastHistory, currHistory];

        const {
            strategy,
            marketPrice,
            quotePrice,
            basePrice,
            feeAmount,
            feePerc,
        } = currHistory;

        // increment inc just in case there are multiple partial filled orders side by side.
        const dataToUpdate = {
            $inc: {
                "pendingLimitOrder.partialFilled.count": 1,
                "pendingLimitOrder.partialFilled.basePrice": basePrice,
                "pendingLimitOrder.partialFilled.quotePrice": quotePrice,
                "pendingLimitOrder.partialFilled.feePerc": feePerc,
                "pendingLimitOrder.partialFilled.feeAmount": feeAmount,
            },
            "pendingLimitOrder.partialFilled.marketPrice": marketPrice,
            "pendingLimitOrder.partialFilled.strategy": strategy,
            "pendingLimitOrder.partialFilled.history": history,
        };
        await LiveCandleHistory.findByIdAndUpdate(LIVE_CANDLE_ID, dataToUpdate);
    },
    clear: async () => {
        const clearPartialFilled = {
            $unset: { "pendingLimitOrder.partialFilled": 1 },
        };
        await LiveCandleHistory.findByIdAndUpdate(
            LIVE_CANDLE_ID,
            clearPartialFilled
        );
    },
};

module.exports = partialFilled;
