const { getBalance } = require("../account");
const {
    getConvertedMarketPrice,
    getBaseQuoteCurrencyFromSymbol,
} = require("../helpers/convertors");
const getPercentage = require("../../utils/number/perc/getPercentage");

async function getCurrencyAmount({
    symbol,
    isBuy = true,
    transactionPositionPerc = 100,
}) {
    const { baseCurrencyAmount, quoteCurrencyAmount } = await handleBalance({
        base: getBaseQuoteCurrencyFromSymbol(symbol, { select: "base" }),
        quote: getBaseQuoteCurrencyFromSymbol(symbol, { select: "quote" }),
    });

    const convertedBaseCurrAmount = await getConvertedMarketPrice(symbol, {
        quote: quoteCurrencyAmount,
        side: "BUY",
    });

    const selectedAmount = isBuy ? convertedBaseCurrAmount : baseCurrencyAmount;
    const finalBaseCurrencyAmount = getPercentage(
        selectedAmount,
        transactionPositionPerc,
        {
            mode: "value",
            noFormat: true,
        }
    );

    // quoteCurrencyAmount: current balance in the exchange e.g R$ 250
    // baseCurrencyAmount: the amount you buy with quote currency BRL (balance in the exchange) e.g 0.00099624
    return {
        baseCurrencyAmount: finalBaseCurrencyAmount,
        quoteCurrencyAmount,
    };
}

// HELPERS
async function handleBalance({ base, quote }) {
    const balanceRes = await getBalance([base, quote]);
    const baseCurrencyAmount = balanceRes[base].available;
    const quoteCurrencyAmount = balanceRes[quote].available;

    return {
        baseCurrencyAmount,
        quoteCurrencyAmount,
    };
}
// END HELPERS

module.exports = getCurrencyAmount;
