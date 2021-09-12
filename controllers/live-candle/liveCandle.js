const {
    TAKER_MARKET_FEE,
    MAKER_LIMIT_FEE,
    checkCondLimitOrder,
} = require("../fees");
const LiveCandleHistory = require("../../models/LiveCandleHistory");
const getPercentage = require("../../utils/number/perc/getPercentage");
const getIncreasedPerc = require("../../utils/number/perc/getIncreasedPerc");
const getLivePrice = require("./getLivePrice");

const LIVE_CANDLE_ID = "612b272114f951135c1938a0";

async function getLiveCandle(options = {}) {
    const {
        symbol = "BTC/BRL", // e.g BTC/BRL
        buyMarketPrice,
        buyBaseAmount,
        buyFeeAmount,
        onlyNetProfitPerc = false,
        candlePriceType = "close",
    } = options;

    const liveHistory = await LiveCandleHistory.findById(LIVE_CANDLE_ID).select(
        "-_id bodySize"
    );
    const currCandleSize = liveHistory && liveHistory.bodySize;

    const needLimitOrder = checkCondLimitOrder({
        signal: "SELL",
        currCandleSize,
    });

    const orderTypePerc = needLimitOrder ? MAKER_LIMIT_FEE : TAKER_MARKET_FEE;

    const candlePriceTypes = ["close", "highest", "lowest"];
    if (!candlePriceTypes.includes(candlePriceType))
        throw new Error("invalid candle type price");

    const { cPrice, hPrice, lPrice } = await getLivePrice(symbol, {
        allCandleData: true,
    });
    let livePrice = cPrice;
    if (candlePriceType === "highest") livePrice = hPrice;
    if (candlePriceType === "lowest") livePrice = lPrice;

    // base price is the same to calculate the live candle since the endQuotePrice should also take the base price into consideration to calculate the different in profit.
    const startQuotePrice = getQuotePrice({
        baseAmount: buyBaseAmount,
        marketPrice: buyMarketPrice,
    });

    const endQuotePrice = getQuotePrice({
        baseAmount: buyBaseAmount,
        marketPrice: livePrice,
    });

    // FEE
    const sellFeeAmount = getPercentage(endQuotePrice, orderTypePerc, {
        mode: "value",
    });

    const totalFeeAmount = getFeeTotal({
        buyVal: buyFeeAmount,
        sellVal: sellFeeAmount,
    });

    const buyFeePerc = getPercentage(startQuotePrice, orderTypePerc, {
        mode: "perc",
    });

    const sellFeePerc = getPercentage(endQuotePrice, orderTypePerc, {
        mode: "perc",
    });

    const totalFeePerc = getFeeTotal({
        buyVal: buyFeePerc,
        sellVal: sellFeePerc,
    });
    // END FEE

    const startNetProfitPrice = Number(
        (startQuotePrice - buyFeeAmount).toFixed(2)
    );
    const endNetProfitPrice = Number(
        (endQuotePrice - sellFeeAmount).toFixed(2)
    );

    const balanceAmount = endNetProfitPrice;

    const { grossProfitAmount, netProfitAmount } = getProfitAmount({
        endQuotePrice,
        startQuotePrice,
        balanceAmount,
    });

    const grossBalanceAmount = Number(
        (startQuotePrice + grossProfitAmount).toFixed(2)
    );

    // netProfitPerc takes initial investiment and subtract with final balance which discounts the fees in both buy/sell prices.
    const netProfitPerc = getIncreasedPerc(startQuotePrice, balanceAmount);

    if (onlyNetProfitPerc)
        return Number.isNaN(netProfitPerc) ? false : netProfitPerc; // sometimes it returns NaN

    return {
        liveCandleClose: livePrice,
        startQuotePrice,
        fee: {
            perc: totalFeePerc,
            amount: totalFeeAmount,
            sellFeeAmount,
        },
        liveResult: {
            grossProfitAmount,
            netProfitAmount,
            netProfitPerc,
            balanceAmount,
            grossBalanceAmount,
        },
    };
}

// HELPERS
function getQuotePrice({ baseAmount, marketPrice }) {
    return Number((baseAmount * marketPrice).toFixed(2));
}

function getFeeTotal({ buyVal, sellVal }) {
    return Number((buyVal + sellVal).toFixed(2));
}

function getProfitAmount({ endQuotePrice, startQuotePrice, balanceAmount }) {
    const grossProfitAmount = Number(
        (endQuotePrice - startQuotePrice).toFixed(2)
    );

    const netProfitAmount = Number(
        (balanceAmount - startQuotePrice).toFixed(2)
    );

    return {
        grossProfitAmount,
        netProfitAmount,
    };
}
// END HELPERS

// getLiveCandle({ symbol: "BTC/BRL", })
// .then(console.log)

module.exports = getLiveCandle;
