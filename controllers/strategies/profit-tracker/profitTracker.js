const AmurretoOrders = require("../../../models/Orders");
const getLiveCandle = require("../../live-candle/liveCandle");
// the goal is the maximize profit by tracking netProfitPerc and decide when to buy/sell based on the min and especially the max profit

async function watchProfitTracker() {
    const profitsData = await getLiveProfitsPerc();
    const watching = Boolean(profitsData.transactionId);

    if (watching) await registerProfitTracker(profitsData);

    return {
        watching,
        ...profitsData,
    };
}

// HELPERS
async function getLiveProfitsPerc() {
    const transactionData = await AmurretoOrders.aggregate([
        {
            $match: {
                status: "pending",
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

    if (!transactionData.length) return {};

    const { list } = transactionData[0];
    const { profitTracker, _id: transactionId } = list;

    const lastBuyData = list.buyPrices.slice(-1)[0];
    const lastBuyMarketPrice = lastBuyData.amounts.market;
    const lastBuyBaseAmount = lastBuyData.amounts.base;

    const defaultDataForLiveCandle = {
        buyMarketPrice: lastBuyMarketPrice,
        buyBaseAmount: lastBuyBaseAmount,
        buyFeeAmount: 0.3,
        onlyNetProfitPerc: true,
    };

    const [max, net] = await Promise.all([
        getLiveCandle({
            ...defaultDataForLiveCandle,
            candlePriceType: "highest",
        }),
        getLiveCandle({
            ...defaultDataForLiveCandle,
            candlePriceType: "close",
        }),
    ]);

    const { maxPerc, netPerc } = compareAndSetHigherPerc({
        maxPerc: max,
        netPerc: net,
        priorPercs: profitTracker,
    });

    return {
        transactionId,
        isProfit: netPerc >= 0,
        maxPerc,
        netPerc,
        diffMax: Math.abs((maxPerc - netPerc).toFixed(2)),
        // diffMin is simply netPerc if loss
    };
}

async function registerProfitTracker(data) {
    const { transactionId, maxPerc, netPerc, diffMax } = data;

    const updateData = {
        "profitTracker.maxPerc": maxPerc,
        "profitTracker.netPerc": netPerc,
        "profitTracker.diffMax": diffMax,
        // "profitTracker.minPerc": minPerc,
    };

    await AmurretoOrders.findByIdAndUpdate(transactionId, updateData);
}

function compareAndSetHigherPerc(data) {
    const { maxPerc, netPerc, priorPercs } = data;

    if (!priorPercs)
        return {
            maxPerc: netPerc,
            netPerc,
        };

    function isCurrValHigher(curr, prior) {
        const isPositive = curr >= 0;
        return isPositive ? curr > prior : curr < prior;
    }

    const priorMaxPerc = priorPercs.maxPerc;

    return {
        maxPerc: isCurrValHigher(maxPerc, priorMaxPerc)
            ? maxPerc
            : priorMaxPerc,
        netPerc, // it does not need to compare with prior because it should be always results in the live value instead of replace it with the prior oneisBlockedByCurcuitBreak
    };
}
// END HELPERS

module.exports = watchProfitTracker;
