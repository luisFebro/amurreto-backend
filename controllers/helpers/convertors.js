const { getTradingSymbolBack } = require("../basicInfo");

async function getConvertedMarketPrice(symbol = "BTC/BRL", options = {}) {
    // BTC (1st currency - base) / BRL (2nd currency - quote)
    const { base, quote, side = "BUY" } = options;
    const toBase = Boolean(quote);
    const isBuySide = side && side.toUpperCase() === "BUY";

    const priceInfo = await getTradingSymbolBack({ symbol });
    // quote money to invest / last price
    const lastAskPrice = Number(priceInfo.ask);
    const lastBidPrice = Number(priceInfo.bid);

    const selectedPrice = isBuySide ? lastAskPrice : lastBidPrice;
    if (toBase) return (Number(quote) / selectedPrice).toFixed(8);
    // crypto value fraction need to have all decimals
    else return (Number(base) * selectedPrice).toFixed(2);
}
// getConvertedMarketPrice("BTC/BRL", { quote: 44.03, side: "sell" })
// .then(console.log)

function getConvertedPrice(price, options = {}) {
    const { base, quote } = options;
    const toBase = Boolean(quote);
    if (toBase) return (Number(quote) / Number(price)).toFixed(8);
    // crypto value fraction need to have all decimals
    else return (Number(base) * Number(price)).toFixed(2);
}

function getBaseQuoteCurrencyFromSymbol(pair = "BTC/BRL", options = {}) {
    const { select = "base" } = options;
    const selectAllow = ["base", "quote"];
    if (!selectAllow.includes(select))
        throw new Error(
            `Invalid select. It must be: ${selectAllow.toString()}`
        );

    if (!pair) return null;

    const slashInd = pair.indexOf("/");

    if (select === "base") {
        const baseCurrency = pair.slice(0, slashInd);
        return baseCurrency;
    }

    const quoteCurrency = pair.slice(slashInd + 1);
    return quoteCurrency;
}

module.exports = {
    getConvertedMarketPrice,
    getConvertedPrice,
    getBaseQuoteCurrencyFromSymbol,
};
