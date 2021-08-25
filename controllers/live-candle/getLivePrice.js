const novadax = require("../exchangeAPI");
const { addHours } = require("../../utils/dates/dateFnsBack");

async function getLivePrice(symbol = "BTC/BRL", options = {}) {
    const { allCandleData = false, unit = "1h", limit = undefined } = options;

    function handleSinceDate(options = {}) {
        const { unit, sinceCount } = options;

        function pickTimeframeDate({ date = new Date(), unit, sinceCount }) {
            return addHours(new Date(date), `-${sinceCount}`).getTime();
        }

        return pickTimeframeDate({
            unit,
            sinceCount: sinceCount,
        });
    }

    const since = handleSinceDate({
        unit,
        sinceCount: 1,
    });
    const mainData = await novadax.fetchOHLCV(symbol, unit, since, limit);

    /* Indexes
       0) 1504541580000, // UTC timestamp in milliseconds, integer
       1) 4235.4,        // (O)pen price, float
       2) 4240.6,        // (H)ighest price, float
       3) 4230.0,        // (L)owest price, float
       4) 4230.7,        // (C)losing price, float
       5) 37.72941911    // (V)olume (in terms of the base currency), float
     */

    const candleData = mainData[0];
    if (allCandleData)
        return {
            oPrice: candleData[1],
            hPrice: candleData[2],
            lPrice: candleData[3],
            cPrice: candleData[4],
        };

    return candleData[4];
}

module.exports = getLivePrice;

// async function getLivePrice(symbol) {
//     const res = await getCandlesticksData({
//         symbol,
//         onlyLiveCandle: true,
//     });
//     // e.g data { symbol: 'BTC/BRL', liveCandleClose: 264841.25 },
//     const livePrice = res && res.liveCandleClose;

//     return livePrice;
// }
