const { TAKER_MARKET_FEE } = require("../fees");
const getPercentage = require("../../utils/number/perc/getPercentage");
const getIncreasedPerc = require("../../utils/number/perc/getIncreasedPerc");
const getLivePrice = require("./getLivePrice");

async function getLiveCandle({
    symbol, // e.g BTC/BRL
    buyBasePrice,
    buyMarketPrice,
    buyFeeAmount,
}) {
    const livePrice = getLivePrice("BTC/BRL");

    // base price is the same to calculate the live candle since the endQuotePrice should also take the base price into consideration to calculate the different in profit.
    const startQuotePrice = getQuotePrice({
        basePrice: buyBasePrice,
        marketPrice: buyMarketPrice,
    });
    const endQuotePrice = getQuotePrice({
        basePrice: buyBasePrice,
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

    const { grossProfitAmount, netProfitAmount } = getProfitAmount({
        endQuotePrice,
        startQuotePrice,
        totalFeeAmount,
    });

    // IMPORTANT: the actual balance in the exchange is higher since the liveCandle already discount buy/sell fees all together so that we can have an accurate profit amount.
    // And yet, the actual balance in exchange can differ a bit.
    const balanceAmount = Number(
        (startQuotePrice + netProfitAmount).toFixed(2)
    );

    const grossBalanceAmount = Number(
        (startQuotePrice + grossProfitAmount).toFixed(2)
    );

    const netProfitPerc = getIncreasedPerc(startQuotePrice, balanceAmount);

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
function getQuotePrice({ basePrice, marketPrice }) {
    return Number((basePrice * marketPrice).toFixed(2));
}

function getFeeTotal({ buyVal, sellVal }) {
    return Number((buyVal + sellVal).toFixed(2));
}

function getProfitAmount({ endQuotePrice, startQuotePrice, totalFeeAmount }) {
    const grossProfitAmount = Number(
        (endQuotePrice - startQuotePrice).toFixed(2)
    );

    const netProfitAmount = Number(
        (grossProfitAmount - totalFeeAmount).toFixed(2)
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
