const {
    getCandlesticksData,
} = require("../../controllers/klines/candlesticks");
const { isCancelled, setDone } = require("../defaults");

(async () => {
    if (isCancelled) return;

    // SELECTED ASSETS ALGO TRADING
    const selectedTradingAssets = ["BTC/BRL"];
    // END SELECTED ASSETS ALGO TRADING

    const allTradings = selectedTradingAssets.map((asset) =>
        getCandlesFor(asset)
    );
    const data = await Promise.all(allTradings);

    const singleDataOrList =
        selectedTradingAssets.length === 1 ? data[0] : data;
    console.log(singleDataOrList);

    setDone();
})();

// HELPERS
async function getCandlesFor(tradingSymbol) {
    // indicators may not work properly in this version if this is a number...
    // ATTENTION: need to be at least the double of sinceCount or at least 100 candles for date's type
    const LIMIT = undefined;

    return await getCandlesticksData({
        symbol: tradingSymbol,
        sinceType: "count", // defaut: count / count, date
        customDate: "2021-07-20T20:00:00.000Z", // if hour less than 9, put 0 in front
        sinceCount: 150, // default: last 250 candles
        noList: true, // default: true,
        reverseData: false,
        onlyBuySignals: false,
        limit: LIMIT, // default: undefined,
    });
}
// END HELPERS
