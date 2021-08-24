const novadax = require("../exchangeAPI");
const AmurretoOrders = require("../../models/Orders");
const { addHours, getDiffInMinutes } = require("../../utils/dates/dateFnsBack");

/*
The goal with circuit breaker in the algo is to prevent buy multiple times when there is a continuous price fluctuation going up and down right in the spot when the algo decide to buy/sell causing undesired multiple transactions with loss.

Having a circuit breaker which interrupts all operations after selling is the solution to this problem.
The algo considers both the last selling price and time so that the market can be in some other spot (bullish or bearish) which does not trigger old decisions already taken.
 */

async function needCircuitBreaker() {
    const MIN_PRICE_DIFF = 1000;
    const MIN_TIME_AFTER_LAST_TRANS = 60; // in minute

    const livePrice = await getLivePrice("BTC/BRL");

    const lastTransactionData = await AmurretoOrders.aggregate([
        {
            $match: {
                status: "done",
            },
        },
        {
            $sort: {
                updatedAt: -1,
            },
        },
        {
            $group: {
                _id: null,
                list: {
                    $push: "$$ROOT",
                },
            },
        },
        {
            $project: {
                list: {
                    $first: "$list",
                },
            },
        },
    ]);

    const data = lastTransactionData && lastTransactionData[0].list;
    const lastSellData = data.sellPrices.slice(-1)[0];
    const lastTransactionSellDate = new Date(lastSellData.timestamp);
    const lastTransactionSellAmount = lastSellData.amounts.market;
    const diffPriceLastTransaction = Math.abs(
        livePrice - lastTransactionSellAmount
    );

    const isBlockedForPrice = diffPriceLastTransaction <= MIN_PRICE_DIFF;
    const isBlockedForTime =
        getDiffInMinutes(lastTransactionSellDate) <= MIN_TIME_AFTER_LAST_TRANS;

    return isBlockedForPrice || isBlockedForTime;
}

// HELPERS
async function getLivePrice(symbol = "BTC/BRL", options = {}) {
    const { unit = "1h", limit = undefined } = options;

    function handleSinceDate(options = {}) {
        const { unit, sinceCount } = options;

        function pickTimeframeDate({ date = new Date(), unit, sinceCount }) {
            return addHours(new Date(date), `-${sinceCount}`).getTime();
        }

        return pickTimeframeDate({
            unit,
            sinceCount: sinceCount,
        });
    }

    const since = handleSinceDate({
        unit,
        sinceCount: 1,
    });
    const mainData = await novadax.fetchOHLCV(symbol, unit, since, limit);

    return mainData[0][4];
}
// END HELPERS

module.exports = needCircuitBreaker;
