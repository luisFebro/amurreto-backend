const { TAKER_MARKET_FEE } = require("../fees");
const getPercentage = require("../../utils/number/perc/getPercentage");
const getIncreasedPerc = require("../../utils/number/perc/getIncreasedPerc");
const getLivePrice = require("./getLivePrice");

async function getLiveCandle(options = {}) {
    const {
        symbol = "BTC/BRL", // e.g BTC/BRL
        buyMarketPrice,
        buyBaseAmount,
        buyFeeAmount,
        onlyNetProfitPerc = false,
        candlePriceType = "close",
    } = options;
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
    const sellFeeAmount = getPercentage(endQuotePrice, TAKER_MARKET_FEE, {
        mode: "value",
    });
    const totalFeeAmount = getFeeTotal({
        buyVal: buyFeeAmount,
        sellVal: sellFeeAmount,
    });
    const totalFeePerc = getFeeTotal({
        buyVal: TAKER_MARKET_FEE,
        sellVal: TAKER_MARKET_FEE,
    });
    // END FEE

    const startNetProfitPrice = Number(
        (startQuotePrice - buyFeeAmount).toFixed(2)
    );
    const endNetProfitPrice = Number(
        (endQuotePrice - sellFeeAmount).toFixed(2)
    );

    const { grossProfitAmount, netProfitAmount } = getProfitAmount({
        endQuotePrice,
        startQuotePrice,
        startNetProfitPrice,
        endNetProfitPrice,
    });

    // IMPORTANT: the actual balance while in a pending live transaction in the exchange is higher since the liveCandle already discount buy/sell fees all together so that we can have an accurate profit amount.
    const balanceAmount = endNetProfitPrice;

    const grossBalanceAmount = Number(
        (startQuotePrice + grossProfitAmount).toFixed(2)
    );

    const netProfitPerc = getIncreasedPerc(startNetProfitPrice, balanceAmount);

    if (onlyNetProfitPerc)
        return Number.isNaN(netProfitPerc) ? false : netProfitPerc; // sometimes it returns NaN

    return {
        liveCandleClose: livePrice,
        startQuotePrice,
        startNetProfitPrice,
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

function getProfitAmount({
    endQuotePrice,
    startQuotePrice,
    startNetProfitPrice,
    endNetProfitPrice,
}) {
    const grossProfitAmount = Number(
        (endQuotePrice - startQuotePrice).toFixed(2)
    );

    const netProfitAmount = Number(
        (startNetProfitPrice - endNetProfitPrice).toFixed(2)
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
