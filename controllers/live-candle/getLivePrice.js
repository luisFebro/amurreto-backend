const { getCandlesticksData } = require("../klines/candlesticks");

async function getLivePrice(symbol) {
    const res = await getCandlesticksData({
        symbol,
        onlyLiveCandle: true,
    });
    // e.g data { symbol: 'BTC/BRL', liveCandleClose: 264841.25 },
    const livePrice = res && res.liveCandleClose;

    return livePrice;
}

module.exports = getLivePrice;
