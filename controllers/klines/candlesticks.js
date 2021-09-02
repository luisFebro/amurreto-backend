const novadax = require("../exchangeAPI");
const { addDays, addHours } = require("../../utils/dates/dateFnsBack");
const getWickVolume = require("./algo/getWickVolume");
const { calculateEMA, analyseEmaTrend } = require("../indicators/ema");
const getPercentage = require("../../utils/number/perc/getPercentage");
const compareTimestamp = require("../../utils/dates/compareTimestamp");
const { createOrderBySignal } = require("../orders/orders");
const { IS_PROD, IS_DEV } = require("../../config");
const setHistoricalLiveCandle = require("../live-candle/historical-data/setHistoricalLiveCandle");
const findCandleBodySize = require("./candle-patterns/helpers/findCandleBodySize");
const detectSequenceStreaks = require("./algo/candle/algo/detectSequenceStreaks");
// strategies
const watchStrategies = require("../strategies/watchStrategies");
const analyseCandlePatterns = require("./candle-patterns/analyseCandlePatterns");
const analyseEmaSignals = require("../strategies/ema/analyseEmaSignals");
// end strategies
// const calculateATR = require("../indicators/atr");
// const calculateRSI = require("../indicators/rsi");
// const getIncreasedPerc = require("../../utils/number/perc/getIncreasedPerc");
// const {
//     checkWingForCandle,
// } = require("./algo/candle/algo/findResistenceSupportWings");

/*
Candlestick Charts are also known as candlesticks, Japanese lines, yin and yang lines, and bar lines. The commonly used term is "K-line", which originated from the 18th century Tokugawa shogunate era in Japan. The rice market transaction (1603-1867) is used to calculate the daily rise and fall of rice prices.
The K line graphically shows the increase and decrease of the strength of the buyers and sellers and the transformation process and actual results. After nearly a hundred years of use and improvement, the K-line theory has been widely accepted by investors.
The drawing of the K-line chart in the stock market and futures market contains four data, namely the opening price, the highest price, the lowest price, and the closing price. All k lines are developed around these four data, reflecting the status and price information of the general trend.
Kline - https://www.programmersought.com/article/7775785243
 */

if (IS_DEV) {
    const LIMIT = undefined; // undefined indicators may not work properly in this version if this is a number...
    getCandlesticksData({
        symbol: "BTC/BRL",
        limit: LIMIT, // undefined, num ATTENTION: need to be at least the double of sinceCount or at least 100 candles for date's tyep
        sinceType: "count", // count, date
        customDate: "2021-09-01T13:00:00.000Z", // if hour less than 9, put 0 in front
        sinceCount: 20, // default 250 last candles
        noList: true, // default true
        reverseData: false,
        onlyBuySignals: false,
    }).then(console.log);
}

// const candlesHistory = [];
async function getCandlesticksData(payload = {}) {
    const {
        symbol,
        unit = "1h", // 30m, 1h, 1d, 1w, 1M
        sinceType = "count", // or date
        customDate,
        sinceCount = 100, // min should be 100 for indicators calculation candles count before current period
        limit, // if no limit is specified, returns up the current period or max 3000, limit is downward if not specified a sinceDate, or from sinceDate to upward quantity limit
        noList = false,
        reverseData = false,
        onlyBuySignals = false,
        onlyLiveCandle = false,
    } = payload;

    const since = handleSinceDate({
        unit,
        sinceType,
        customDate,
        sinceCount: onlyLiveCandle ? 1 : sinceCount,
    });
    const mainData = await novadax.fetchOHLCV(symbol, unit, since, limit);

    if (onlyLiveCandle) {
        return {
            symbol,
            liveCandleClose: mainData[0][4],
        };
    }

    // it is required to have the double of the mainData so that we can calculate all prior EMA.
    const candlesCount = mainData.length;
    const sinceForClose = handleSinceDate({
        moreCount: candlesCount,
        unit,
        sinceType,
        customDate,
        sinceCount,
    });

    const dataForIndicators = await novadax.fetchOHLCV(
        symbol,
        unit,
        sinceForClose,
        limit
    );

    let candlestickData = mainData.map((candle, ind) => {
        const timestamp = new Date(candle[0]);
        const isLiveCandle = compareTimestamp(timestamp);

        // PRICE PERIOD DATA
        const open = candle[1];
        const highest = candle[2];
        const lowest = candle[3];
        const close = candle[4];
        // END PRICE PERIOD DATA

        // VOLUME
        const vol = Number(candle[5].toFixed(0));
        const volRealBody = Number((close - open).toFixed(2));
        const isBullish = Boolean(volRealBody > 0);
        const allPriceData = {
            open,
            max: highest,
            min: lowest,
            close,
            isBullish,
            timestamp,
        };
        const volUpperWick = getWickVolume("upper", allPriceData);
        const volLowerWick = getWickVolume("lower", allPriceData);
        const volFullCandle = Number((highest - lowest).toFixed(2));
        const volRealBodyPerc = Math.abs(
            getPercentage(volFullCandle, volRealBody)
        );
        const volUpperWickPerc = Math.abs(
            getPercentage(volFullCandle, volUpperWick)
        );
        const volLowerWickPerc = Math.abs(
            getPercentage(volFullCandle, volLowerWick)
        );
        const allVolData = {
            marketVol: vol,
            volRealBody,
            wholeCandleSize: volFullCandle,
            bodyPerc: volRealBodyPerc,
            upperPerc: volUpperWickPerc,
            lowerPerc: volLowerWickPerc,
        };
        // END VOLUME

        // const lastClosePrice = candlesHistory.slice(-1)[0]
        //     ? candlesHistory.slice(-1)[0].price.close
        //     : 0;

        // candlesHistory.push({ vol: allVolData, price: allPriceData });

        const candleBodySize = findCandleBodySize(allVolData);
        const { oneCandleType, twoCandleType, threeCandleType } =
            analyseCandlePatterns({
                price: allPriceData,
                vol: allVolData,
                candleBodySize,
            });

        const finalData = {
            count: ind + 1,
            open,
            close,
            // candle
            timestamp,
            isBullish,
            oneCandleType,
            twoCandleType,
            threeCandleType,
            candleBodySize,
            bodyPerc: volRealBodyPerc,
            upperPerc: volUpperWickPerc,
            lowerPerc: volLowerWickPerc,
            // volRealBody,
            // priceInc: getIncreasedPerc(lastClosePrice, close),
            // end candles
            // open,
            // highest,
            // lowest,
            // vol,
            // volUpperWick,
            // volLowerWick,
            // volFullCandle,
            // volRealBodyPerc,
            // volUpperWickPerc,
            // volLowerWickPerc,
        };

        if (isLiveCandle) finalData["liveCandle"] = true;
        return finalData;
    });

    // const currPrice = candlestickData.slice(-1)[0]
    //     ? candlestickData.slice(-1)[0].close
    //     : 0;
    // const { threads, nextResistence, nextSupport, keyResistence, keySupport } =
    //     detectSequenceStreaks(candlesThread, { currPrice });

    // INDICATORS CALCULATION
    const closingPrices = dataForIndicators.map((candle) => candle[4]);

    // const dataRsi = calculateRSI(closingPrices, { candlesCount });

    const { dataEma9, dataEma20, dataEma50 } = calculateEMAs(
        closingPrices,
        candlesCount
    );

    // const dataForAtr = dataForIndicators.map((candle) => ({
    //     highest: candle[2],
    //     lowest: candle[3],
    //     close: candle[4],
    // }));
    // const dataAtr = calculateATR(dataForAtr, { candlesCount });

    // const indicatorsPeriod = -9;
    // 14-lastPeriod maxVolat will be used to calcalate stop loss
    // const maxAtr9 =
    //     dataAtr.slice(indicatorsPeriod)[0] &&
    //     dataAtr.slice(indicatorsPeriod).sort((a, b) => b - a)[0].atr;
    // const maxVol9 =
    //     candlestickData.slice(indicatorsPeriod) &&
    //     candlestickData
    //         .slice(indicatorsPeriod)
    //         .map((candle) => candle.vol)
    //         .sort((a, b) => b - a)[0];
    // END INDICATORS CALCULATION

    candlestickData = candlestickData.map((candle, ind) => {
        // ema data only works with 100 candles or above.
        const ema9 = dataEma9[ind];
        const ema20 = dataEma20[ind];
        const ema50 = dataEma50[ind];

        const emaTrend =
            ema9 && ema20 && ema50
                ? analyseEmaTrend({ ema9, ema20, ema50 })
                : null;

        // const atrData = dataAtr[ind];
        // const rsi = dataRsi[ind];
        // const isOverbought = rsi >= 70;
        // const isOversold = rsi <= 30;

        // const {
        //     threadsCount,
        //     isHigherWing,
        //     isLowerWing,
        //     // isKeySupport,
        //     // isKeyResistence,
        // } = checkWingForCandle(candle, threads);

        const secondCheckData = {
            ...candle,
            emaTrend,
            finalSignal: analyseEmaSignals({ emaTrend }).signal,
            // atr: atrData && atrData.atr,
            // incAtr: atrData && atrData.incVolat,
            // isMaxAtr9: maxAtr9 === (atrData && atrData.atr),
            // isMaxVolume9: maxVol9 === candle.vol,
            // ema9,
            // ema20,
            // ema50,
        };

        return secondCheckData;
    });

    const MAX_CANDLES_SEQUENCE = 20;
    const dataForSequenceStreak = candlestickData.slice(
        `-${MAX_CANDLES_SEQUENCE}`
    );
    const { sequenceStreaks, lowerWing20 } = detectSequenceStreaks(
        dataForSequenceStreak
    );

    const liveCandle = candlestickData.slice(-1)[0] || {};
    const lastEma9 = dataEma9.slice(-1)[0];
    const lastEma20 = dataEma20.slice(-1)[0];
    const lastEma50 = dataEma50.slice(-1)[0];
    // const lastRsi = dataRsi.slice(-1)[0];
    // const lastIncPrice = liveCandle.priceInc;
    // const lastAtr = dataAtr.slice(-1)[0];
    const lastEmaTrend = analyseEmaTrend({
        ema9: lastEma9,
        ema20: lastEma20,
        ema50: lastEma50,
    });

    // the data will be mingled with current local dev, so only in prod.
    let candleReliability = { status: true };
    if (IS_PROD) {
        candleReliability = await setHistoricalLiveCandle({
            side: liveCandle.isBullish ? "bull" : "bear",
            timestamp: liveCandle.timestamp,
            emaTrend: lastEmaTrend,
            openPrice: liveCandle.open,
            currBodySize: liveCandle.candleBodySize,
            lowerWing20,
            sequenceStreaks,
        });
    }

    const finalSignalData = await watchStrategies({
        liveCandle,
        candleReliability,
        lowerWing20,
        sequenceStreaks,
        // lastEmaTrend,
    });

    // now all orders registration to exchange and db is by default only executed in PRODUCTION
    await createOrderBySignal(finalSignalData, { symbol });

    // const lastIsOverbought = lastRsi >= 70;
    const indicators = {
        emaTrend: lastEmaTrend,
        // ema9: lastEma9,
        // ema20: lastEma20,
        // ema50: lastEma50,
        // rsi: lastRsi,
        // atr: lastAtr && lastAtr.atr,
        // sub
        // isOverbought: lastIsOverbought,
        // isOversold: lastRsi <= 30,
        // isMaxAtr9: liveCandle.isMaxAtr9,
        // isMaxVolume9: liveCandle.isMaxVolume9,
        // incAtr: liveCandle.incAtr,
        // maxAtr9,
    };

    return {
        symbol,
        candles: {
            count: candlesCount,
            startTimestamp: candlestickData[0] && candlestickData[0].timestamp,
            endTimestamp: liveCandle.timestamp,
            isBullish: liveCandle.isBullish,
            oneCandleType: liveCandle.oneCandleType,
            twoCandleType: liveCandle.twoCandleType,
            threeCandleType: liveCandle.threeCandleType,
            // incPrice: lastIncPrice,
        },
        indicators,
        // finalSignal: finalSignalData.signal,
        list: handleListData(candlestickData, {
            noList,
            reverseData,
            onlyBuySignals,
        }),
        // borders: {
        //     nextResistence,
        //     nextSupport,
        //     keyResistence,
        //     keySupport,
        //     isHigherWing: liveCandle.isHigherWing,
        //     isLowerWing: liveCandle.isLowerWing,
        //     isKeySupport: liveCandle.isKeySupport,
        //     isKeyResistence: liveCandle.isKeyResistence,
        // },
    };
}

// HELPERS
function handleListData(list, { noList, reverseData, onlyBuySignals }) {
    // ascending/historical order by default so that we read from the last to the top, otherwise it would not be possible to see the historical
    if (noList) return null;

    if (onlyBuySignals)
        list = list.filter(
            (candle) =>
                candle.finalSignal.toUpperCase() === "BUY" ||
                candle.finalSignal.toUpperCase() === "HOLD"
        );
    if (reverseData) list = list.reverse();

    return list;
}

function handleSinceDate(options = {}) {
    const { moreCount, sinceType, customDate, unit, sinceCount } = options;

    if (sinceType === "date" && customDate) {
        if (moreCount) {
            const moreCountDate = pickTimeframeDate({
                date: customDate,
                unit,
                sinceCount: moreCount,
            });
            return new Date(moreCountDate).getTime();
        }
        return new Date(customDate).getTime();
    }

    return pickTimeframeDate({
        unit,
        sinceCount: moreCount ? sinceCount * 2 : sinceCount,
    });
}

function pickTimeframeDate({ date = new Date(), unit, sinceCount }) {
    if (unit === "1d")
        return addDays(new Date(date), `-${sinceCount}`).getTime();
    return addHours(new Date(date), `-${sinceCount}`).getTime();
}

function calculateEMAs(closingPrices, candlesCount) {
    const dataEma9 = calculateEMA(closingPrices, {
        candlesCount,
        period: 9,
        listOnly: true,
    });
    const dataEma20 = calculateEMA(closingPrices, {
        candlesCount,
        period: 20,
        listOnly: true,
    });
    const dataEma50 = calculateEMA(closingPrices, {
        candlesCount,
        period: 50,
        listOnly: true,
    });

    return {
        dataEma9,
        dataEma20,
        dataEma50,
    };
}
// END HELPERS

module.exports = { getCandlesticksData };

/*
params  mandatory type
symbol  true    string  Trading symbol
unit    true    string  ONE_MIN,FIVE_MIN, FIFTEEN_MIN,HALF_HOU,ONE_HOU,ONE_DAY,ONE_WEE,ONE_MON;
from    true    number  The start time All time units only save the latest 3000 data
to  true    number  The end time All time units only save the latest 3000 data

There’s a limit on how far back in time your requests can go. Most of exchanges will not allow to query detailed candlestick history (like those for 1-minute and 5-minute timeframes) too far in the past. They usually keep a reasonable amount of most recent candles, like 1000 last candles for any timeframe is more than enough for most of needs. You can work around that limitation by continuously fetching (aka REST polling) latest OHLCVs and storing them in a CSV file or in a database.

Note that the info from the last (current) candle may be incomplete until the candle is closed (until the next candle starts)

[
    [
        1504541580000, // UTC timestamp in milliseconds, integer
        4235.4,        // (O)pen price, float
        4240.6,        // (H)ighest price, float
        4230.0,        // (L)owest price, float
        4230.7,        // (C)losing price, float
        37.72941911    // (V)olume (in terms of the base currency), float
    ],
    ...
]
The list of candles is returned sorted in ascending (historical/chronological) order, oldest candle first, most recent candle last.
 https://ccxt.readthedocs.io/en/latest/manual.html#ohlcv-candlestick-charts
 */
