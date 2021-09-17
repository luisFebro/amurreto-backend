const AmurretoOrders = require("../../../models/Orders");
const getLiveCandle = require("../../live-candle/liveCandle");
// the goal is the maximize profit by tracking netProfitPerc and decide when to buy/sell based on the min and especially the max profit

async function watchProfitTracker({ liveCandle }) {
    const atrLimits = liveCandle.atrLimits;
    const maxCurrPrice = liveCandle.close;

    const profitsData = await getLiveProfitsPerc({
        maxClosePrice: maxCurrPrice,
    });
    const watching = Boolean(profitsData.transactionId);

    if (watching) {
        await registerProfitTracker(profitsData, { atrLimits });
    }

    return {
        watching,
        ...profitsData,
    };
}

// HELPERS
async function getLiveProfitsPerc({ maxClosePrice }) {
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

    const partialBuyBaseAmount = lastBuyData.partialOrderData
        ? lastBuyData.partialOrderData.history.reduce(
              (curr, next) => curr + next.amounts.base,
              0
          )
        : 0;
    const lastPendingBuyBaseAmount =
        lastBuyData.amounts.base + partialBuyBaseAmount;

    const partialFeeAmount = lastBuyData.partialOrderData
        ? lastBuyData.partialOrderData.history.reduce(
              (curr, next) => curr + next.fee.amount,
              0
          )
        : 0;
    const lastPendingBuyFeeAmount = lastBuyData.fee.amount + partialFeeAmount;

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
        maxCurrPrice = 0,
        maxPerc = 0,
        minPerc = 0,
        netPerc,
    } = compareAndSetHigherPerc({
        maxPerc: max,
        netPerc: net,
        minPerc: min,
        maxClosePrice,
        priorDbData: profitTracker,
    });

    return {
        transactionId,
        strategy: currStrategy,
        isProfit: netPerc >= 0,
        maxCurrPrice,
        maxPerc,
        netPerc,
        minPerc,
        diffMax: Math.abs((maxPerc - netPerc).toFixed(2)),
        // diffVolat detected wrongly near the profit zone.
        // diffVolat: Math.abs((maxPerc - minPerc).toFixed(2)),
        atrLimit: profitTracker && profitTracker.atrLimit,
        atrUpperLimit: profitTracker && profitTracker.atrUpperLimit,
        atrLowerLimit: profitTracker && profitTracker.atrLowerLimit,
    };
}

async function registerProfitTracker(data = {}, options = {}) {
    const { atrLimits = {} } = options;
    const { transactionId, maxCurrPrice, maxPerc, netPerc, minPerc, diffMax } =
        data;

    // compare so that only the first atr parameters are registered, when buying...
    const gotPriorDbAtr = Boolean(data.atrLimit);

    const atrUpdate = gotPriorDbAtr
        ? {}
        : {
              "profitTracker.atrUpperLimit": atrLimits.atrUpperLimit,
              "profitTracker.atrLowerLimit": atrLimits.atrLowerLimit,
              "profitTracker.atrLimit": atrLimits.atrLimit,
          };

    const updateData = {
        "profitTracker.diffMax": diffMax,
        "profitTracker.maxPerc": maxPerc,
        "profitTracker.netPerc": netPerc,
        "profitTracker.minPerc": minPerc,
        "profitTracker.maxCurrPrice": maxCurrPrice,
        ...atrUpdate,
    };

    await AmurretoOrders.findByIdAndUpdate(transactionId, updateData);
}

function compareAndSetHigherPerc(data) {
    const { maxPerc, minPerc, netPerc, maxClosePrice, priorDbData } = data;

    if (!priorDbData)
        return {
            maxCurrPrice: 0,
            maxPerc: netPerc || 0,
            netPerc: netPerc || 0,
            minPerc: 0,
        };

    const priorMaxCurrPrice = priorDbData.maxCurrPrice;
    const priorMaxPerc = priorDbData.maxPerc;
    const priorMinPerc = priorDbData.minPerc;

    return {
        maxCurrPrice:
            maxClosePrice > priorMaxCurrPrice
                ? maxClosePrice
                : priorMaxCurrPrice,
        maxPerc: maxPerc > priorMaxPerc ? maxPerc : priorMaxPerc,
        netPerc, // it does not need to compare with prior because it should be always results in the live value instead of replace it with the prior oneisBlockedByCurcuitBreak
        minPerc: minPerc < priorMinPerc ? minPerc : priorMinPerc,
    };
}
// END HELPERS

module.exports = watchProfitTracker;
