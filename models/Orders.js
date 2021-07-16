const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const collectionName = "altrabot";

const transactionData = {
    type: {
        type: String,
        enum: ["LIMIT", "MARKET"],
    },
    timestamp: Number,
    amounts: {
        base: Number,
        quote: Number,
        market: Number,
    }, // coin/security price
    transactionPositionPerc: { type: Number, default: 0 }, // the current asset position perc from the totalPosition of a particular asset
    strategy: String, // strategy name which triggers the order transaction
    fee: {
        perc: Number,
        amount: Number,
    },
};

const TransactionSchema = new Schema(transactionData, { _id: true });

const data = {
    status: {
        type: String,
        default: "pending",
        enum: ["pending", "done"],
    },
    statusExchange: String, // n2
    symbol: { type: String, default: "BTC/BRL" }, // base and quote currency pair
    capitalPosition: {
        // for simplicity, can share all capital equality among assets like BTC and ETH, R$ 500 each for a  R$ 1000 capital
        totalPerc: { type: Number, default: 100 }, // the position is the maximum amount in percentage that will be invested in the current asset. E.g 50% for BTC and 50% for ETH with an available capital of R$ 1.000, the maximum amount (100%) for each asset would be R$ 500
        amount: { type: Number },
    },
    buyPrices: [TransactionSchema],
    sellPrices: [TransactionSchema],
    checkPendingOrderCount: Number,
};

const orderSchema = new Schema(data, { timestamps: true });
module.exports = mongoose.model("AmurretoOrders", orderSchema, collectionName);

/* COMMENTS
n2:
Order status(order.status)
// cancellable/unfinished
PROCESSING：The order has been submitted and is in the matching queue, waiting for deal. The order is unfinished.
CANCELING：This order is being canceled, but it is unfinished at the moment and still in the matching queue.
PARTIAL_FILLED：The order is already in the matching queue and partially traded, and is waiting for further matching and trade. The order is unfinished
SUBMITTED：The order has been submitted but not processed, not in the matching queue yet. The order is unfinished.
// finished
FILLED：This order has been completely traded, finished and no longer in the matching queue.
PARTIAL_CANCELED：The order has been partially traded and canceled by the user and is no longer in the matching queue. This order is finished.
PARTIAL_REJECTED：The order has been rejected by the system after being partially traded. Now it is finished and no longer in the matching queue.
CANCELED：This order has been canceled by the user before being traded. It is finished now and no longer in the matching queue.
REJECTED：This order has been rejected by the user before being traded. It is finished now and no longer in the matching queue.
*/
