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

    const lastBuyData = list.buyPrices
        ? list.buyPrices.slice(-1)[0]
        : { amounts: 0, fee: 0 };
    const lastPendingBuyMarketPrice = lastBuyData.amounts.market;
    const lastPendingBuyBaseAmount = lastBuyData.amounts.base;
    const lastPendingBuyFeeAmount = lastBuyData.fee.amount;
    const currStrategy = lastBuyData.strategy;

    const defaultDataForLiveCandle = {
        buyMarketPrice: lastPendingBuyMarketPrice,
        buyBaseAmount: lastPendingBuyBaseAmount,
        buyFeeAmount: lastPendingBuyFeeAmount,
        onlyNetProfitPerc: true,
    };

    const [max, net, min] = await Promise.all([
        getLiveCandle({
            ...defaultDataForLiveCandle,
            candlePriceType: "highest",
        }),
        getLiveCandle({
            ...defaultDataForLiveCandle,
            candlePriceType: "close",
        }),
        getLiveCandle({
            ...defaultDataForLiveCandle,
            candlePriceType: "lowest",
        }),
    ]);

    const {
        maxPerc = 0,
        minPerc = 0,
        netPerc,
    } = compareAndSetHigherPerc({
        maxPerc: max,
        netPerc: net,
        minPerc: min,
        priorPercs: profitTracker,
    });

    return {
        transactionId,
        strategy: currStrategy,
        isProfit: netPerc >= 0,
        maxPerc,
        netPerc,
        minPerc,
        diffMax: Math.abs((maxPerc - netPerc).toFixed(2)),
        diffVolat: Math.abs((maxPerc - minPerc).toFixed(2)),
    };
}

async function registerProfitTracker(data) {
    const { transactionId, maxPerc, netPerc, minPerc, diffMax, diffVolat } =
        data;

    const updateData = {
        "profitTracker.diffMax": diffMax,
        "profitTracker.maxPerc": maxPerc,
        "profitTracker.netPerc": netPerc,
        "profitTracker.minPerc": minPerc,
        "profitTracker.diffVolat": diffVolat,
    };

    await AmurretoOrders.findByIdAndUpdate(transactionId, updateData);
}

function compareAndSetHigherPerc(data) {
    const { maxPerc, minPerc, netPerc, priorPercs } = data;

    if (!priorPercs)
        return {
            maxPerc: netPerc || 0,
            netPerc: netPerc || 0,
        };

    const priorMaxPerc = priorPercs.maxPerc;
    const priorMinPerc = priorPercs.minPerc;

    return {
        maxPerc: maxPerc > priorMaxPerc ? maxPerc : priorMaxPerc,
        netPerc, // it does not need to compare with prior because it should be always results in the live value instead of replace it with the prior oneisBlockedByCurcuitBreak
        minPerc: minPerc < priorMinPerc ? minPerc : priorMinPerc,
    };
}
// END HELPERS

module.exports = watchProfitTracker;
