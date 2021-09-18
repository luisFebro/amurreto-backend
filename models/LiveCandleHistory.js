const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const collectionName = "live-candle-history";

const mainData = {
    timestamp: String,
    sidesStreak: Array, // e.g ["bull", "bear"]
    bullSidePerc: Number,
    bearSidePerc: Number,
    emaTrend: String,
    openPrice: Number,
    bodySize: String,
    lowerWing20: Object, // { closePrice, timestamp, diffCurrPrice } so that we can detect buy opportunities in case of other strategies failed to detect.
    sequenceStreaks: String,
    wholeCandleSize: String,
    pendingLimitOrder: {
        signal: { type: String, enum: ["BUY", "SELL"] },
        strategy: String,
        count: Number,
        openOrderId: String,
        attempts: Number,
        partialFilled: {
            count: Number, // total orders
            basePrice: Number,
            strategy: String,
            quotePrice: Number,
            marketPrice: Number,
            feePerc: Number,
            feeAmount: Number,
            history: Array, // all the previous data.
        }, // record partially filled orders to be combined with the next filled order
    },
    candleReliability: Object,
    atr: Number,
    oneCandleType: String,
    twoCandleType: String,
    threeCandleType: String,
    isCircuitBreakerBlock: Boolean,
    circuitBreakerData: Object,
};

const HistoryData = new Schema(mainData, { _id: true });

const data = {
    ...mainData,
    history: [HistoryData],
};

const orderSchema = new Schema(data, { timestamps: false });
module.exports = mongoose.model(
    "LiveCandleHistory",
    orderSchema,
    collectionName
);
