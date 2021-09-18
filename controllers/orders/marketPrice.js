const { getTradingSymbolBack } = require("../basicInfo");

async function analyseMarketPrice(data) {
    const { isBuy } = data;

    const getPrice = async () => {
        const price = await getMarketPrice(data);

        return await new Promise((resolve) => {
            const interval = setInterval(() => {
                resolve(price);
                clearInterval(interval);
            }, 1000);
        });
    };

    const latestPrices = [];
    const price1 = await getPrice(data);
    latestPrices.push(price1);
    const price2 = await getPrice(data);
    latestPrices.push(price2);
    const price3 = await getPrice(data);
    latestPrices.push(price3);
    const price4 = await getPrice(data);
    latestPrices.push(price4);
    const price5 = await getPrice(data);
    latestPrices.push(price5);
    const price6 = await getPrice(data);
    latestPrices.push(price6);
    const price7 = await getPrice(data);
    latestPrices.push(price7);
    const price8 = await getPrice(data);
    latestPrices.push(price8);
    const price9 = await getPrice(data);
    latestPrices.push(price9);
    const price10 = await getPrice(data);
    latestPrices.push(price10);

    const pricesRange = [...new Set([...latestPrices])];

    // const diffPrices = [];
    // let lastVal = 0;
    // pricesRange.forEach((p, ind) => {
    //     if (ind !== 0)
    //         diffPrices.push(Number(Math.abs(p - lastVal).toFixed(2)));
    //     lastVal = p;
    // });

    // const sumPrices = diffPrices.reduce((curr, next) => curr + next, 0);
    // const DEFAULT_OFFSET = 50;
    // const offsetPrice = Math.floor(sumPrices / diffPrices.length);

    // const sumRange = pricesRange.reduce((curr, next) => curr + next, 0)
    const bestPrice = isBuy
        ? Math.min(...pricesRange)
        : Math.max(...pricesRange); // Number((sumRange / pricesRange.length).toFixed(2))  //

    return bestPrice;
}

// HELPERS
async function getMarketPrice({
    isBuy,
    payload = {},
    symbol = "BTC/BRL",
    offsetPrice = 0, // preço deslocado
    forcePrice,
    lastPrice = false,
}) {
    if (payload.price) return payload.price;

    const priceInfo = await getTradingSymbolBack({ symbol });
    // quote money to invest / last price
    const lastAskPrice = lastPrice
        ? Number(priceInfo.lastPrice)
        : Number(priceInfo.ask); // sellers prices
    const lastBidPrice = lastPrice
        ? Number(priceInfo.lastPrice)
        : Number(priceInfo.bid); // buyers prices
    // const test = Boolean(true);
    // if buy I want a price that other buyers are willing to buy and offsetPrice is distance below this price.The same with selling
    const isNormalPrice = !forcePrice;
    const buyBid = isNormalPrice ? lastBidPrice : lastAskPrice;
    const sellAsk = isNormalPrice ? lastAskPrice : lastBidPrice;
    return isBuy ? buyBid - offsetPrice : sellAsk + offsetPrice;
}
// END HELPERS

// const marketPriceData = {
//     isBuy: true,
//     symbol: "BTC/BRL",
//     offsetPrice: 0,
//     forcePrice: false,
//     lastPrice: false,
// };

// const marketPriceData2 = {
//     isBuy: true,
//     symbol: "BTC/BRL",
//     offsetPrice: 50,
//     forcePrice: true,
//     lastPrice: false,
// };

// analyseMarketPrice(marketPriceData)
// .then(res => console.log("normal", res))

// analyseMarketPrice(marketPriceData2)
// .then(res => console.log("enforced", res))

module.exports = analyseMarketPrice;
