const novadax = require("../exchangeAPI");
const watchProfitTracker = require("../strategies/profit-tracker/profitTracker");
const { addDays, addHours } = require("../../utils/dates/dateFnsBack");
const getWickVolume = require("./algo/getWickVolume");
const getPercentage = require("../../utils/number/perc/getPercentage");
const compareTimestamp = require("../../utils/dates/compareTimestamp");
const { createOrderBySignal } = require("../orders/orders");
const { IS_DEV } = require("../../config");
const setHistoricalLiveCandle = require("../live-candle/historical-data/setHistoricalLiveCandle");
const findCandleBodySize = require("./candle-patterns/helpers/findCandleBodySize");
const detectSequenceStreaks = require("./algo/candle/detectSequenceStreaks");
const needCircuitBreaker = require("../helpers/circuitBreaker");
// const isContinuationTrend = require("./algo/candle/isContinuationTrend");
// indicators
const { calculateEMA, analyseEmaTrend } = require("../indicators/ema");
const calculateATR = require("../indicators/atr");
// end indicators
// const calculateRSI = require("../indicators/rsi");
// strategies
const watchStrategies = require("../strategies/watchStrategies");
const analyseCandlePatterns = require("./candle-patterns/analyseCandlePatterns");
// const analyseEmaSignals = require("../strategies/ema/analyseEmaSignals");
// end strategies
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
        customDate: "2021-09-07T13:00:00.000Z", // if hour less than 9, put 0 in front
        sinceCount: 250, // default 250 last candles
        noList: true, // default true
        reverseData: false,
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
        // console.log("volFullCandle", volFullCandle);
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
            close, // do not remove
            highest, // do not remove
            lowest, // do not remove
            // candle
            timestamp,
            isBullish,
            oneCandleType, // do not remove
            twoCandleType, // do not remove
            threeCandleType, // do not remove
            candleBodySize, // do not remove
            bodyPerc: volRealBodyPerc,
            upperPerc: volUpperWickPerc,
            lowerPerc: volLowerWickPerc,
            volFullCandle, // do not remove - for historical
            // volRealBody,
            // priceInc: getIncreasedPerc(lastClosePrice, close),
            // end candles
            // open,
            // highest,
            // lowest,
            // vol,
            // volUpperWick,
            // volLowerWick,
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

    // INDICATORS CALCULATION
    const closingPrices = dataForIndicators.map((candle) => candle[4]);
    // ema
    const { dataEma9, dataEma20, dataEma50 } = calculateEMAs(
        closingPrices,
        candlesCount
    );
    // end ema

    // atr
    const dataForAtr = dataForIndicators.map((candle) => ({
        highest: candle[2],
        lowest: candle[3],
        close: candle[4],
    }));
    const dataAtr = calculateATR(dataForAtr, { candlesCount });
    // end atr

    // const dataRsi = calculateRSI(closingPrices, { candlesCount });

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

        const thisDataAtr = dataAtr[ind];
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
        const atr = thisDataAtr && thisDataAtr.atr;

        const secondCheckData = {
            ...candle,
            emaTrend, // do not remove it
            // finalSignal: null,
            // incAtr: atrData && atrData.incVolat,
            // isMaxAtr9: maxAtr9 === (atrData && atrData.atr),
            // isMaxVolume9: maxVol9 === candle.vol,
            // ema9,
            // ema20,
            // ema50,
        };

        return secondCheckData;
    });

    const MAX_CANDLES_SEQUENCE = 96; // last 4 days
    const dataForSequenceStreak = candlestickData.slice(
        `-${MAX_CANDLES_SEQUENCE}`
    );

    // continuation trend
    const MAX_CONT_TREND = 4;
    const contTrendData = candlestickData.slice(`-${MAX_CONT_TREND}`);
    // const isContTrend = isContinuationTrend(contTrendData);
    // end continuation trend

    let liveCandle = candlestickData.slice(-1)[0] || {};
    const lastLiveCandle = candlestickData.slice(-2)[0] || {};
    const lastEma9 = dataEma9.slice(-1)[0];
    const lastEma20 = dataEma20.slice(-1)[0];
    const lastEma50 = dataEma50.slice(-1)[0];
    const lastAtr = dataAtr.slice(-1)[0];
    // const lastRsi = dataRsi.slice(-1)[0];
    // const lastIncPrice = liveCandle.priceInc;
    const lastEmaTrend = analyseEmaTrend({
        ema9: lastEma9,
        ema20: lastEma20,
        ema50: lastEma50,
    });

    // watchProfitTracker is the highest priority to track pending transaction.
    const profitTracker = await watchProfitTracker({ liveCandle });
    const maxPerc = profitTracker ? profitTracker.maxPerc : null;
    console.log("profitTracker", profitTracker);

    const {
        isBlock: isCircuitBreakerBlock,
        circuitBreakerData,
        lastProfitRow,
    } = await needCircuitBreaker({ emaTrend: lastEmaTrend });

    const { sequenceStreaks, lowerWing, higherWing, stoplossGrandCandle } =
        detectSequenceStreaks(dataForSequenceStreak, {
            maxPerc,
            lastProfitRow,
        });

    const candleReliability = await setHistoricalLiveCandle({
        // somehow the loop last emaTrend is having different wrongly results comparing to lastEmaTrend
        liveCandle: {
            ...liveCandle,
            emaTrend: lastEmaTrend,
        },
        emaTrend: lastEmaTrend,
        lowerWing,
        higherWing,
        sequenceStreaks,
        isCircuitBreakerBlock,
        circuitBreakerData,
    });

    const finalSignalData = await watchStrategies({
        profitTracker,
        liveCandle: {
            ...liveCandle,
            emaTrend: lastEmaTrend,
        },
        lastLiveCandle,
        candleReliability,
        lowerWing,
        higherWing,
        stoplossGrandCandle,
        sequenceStreaks,
        isContTrend: false,
        lastProfitRow,
    });

    // now all orders registration to exchange and db is by default only executed in PRODUCTION
    const signalOpts = {
        isCircuitBreakerBlock,
    };
    await createOrderBySignal({ symbol, ...finalSignalData }, signalOpts);

    // const lastIsOverbought = lastRsi >= 70;
    const indicators = {
        emaTrend: lastEmaTrend,
        atr: lastAtr && lastAtr.atr,
        lowerWing,
        higherWing,
        stoplossGrandCandle,
        // isContTrend,
        // ema9: lastEma9,
        // ema20: lastEma20,
        // ema50: lastEma50,
        // rsi: lastRsi,
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
        timestamp: candlestickData[0] && candlestickData[0].timestamp,
        candles: {
            candleReliability: JSON.stringify(candleReliability),
            count: candlesCount,
            side: liveCandle.isBullish ? "bull" : "bear",
            wholeBodySize: liveCandle.volFullCandle,
            bodySize: liveCandle.candleBodySize,
            oneCandleType: liveCandle.oneCandleType,
            twoCandleType: liveCandle.twoCandleType,
            threeCandleType: liveCandle.threeCandleType,
            // incPrice: lastIncPrice,
        },
        circuitBreaker: {
            isBlock: isCircuitBreakerBlock,
            timeLeft: circuitBreakerData && circuitBreakerData.timeLeft, // in min
            totalTime: circuitBreakerData && circuitBreakerData.totalDuration,
            lastProfitRow,
        },
        indicators,
        list: handleListData(candlestickData, {
            noList,
            reverseData,
        }),
    };
}

function handleListData(list, { noList, reverseData }) {
    // ascending/historical order by default so that we read from the last to the top, otherwise it would not be possible to see the historical
    if (noList) return null;
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

/* ARCHIVES
// HELPERS
atr,
atrLimits: setAtrBoundaries({ atr, close: candle.close }),
atrLimitsJson: setAtrBoundaries({
    json: true,
    atr,
    close: candle.close,
}),

function setAtrBoundaries({ json = false, close, atr }) {
    const MULTIPLIER = 2;
    const atrDefaultBoundary = atr * MULTIPLIER;
    const disableATR = atr >= 4000; // 4000

    const data = {
        atrUppedsarLimit: Number((close + atrDefaultBoundary).toFixed(2)),
        atrLowedarLimit: Number((close - atrDefaultBoundary).toFixed(2)),
        atrLidasmit: Number(atrDefaultBoundary.toFixed(2)),
        disableATR,
    };

    if (!json) return data;
    return JSON.stringify(data);
}


if (onlyBuySignals)
list = list.filter(
    (candle) =>
        candle.finalSignal.toUpperCase() === "BUY" ||
        candle.finalSignal.toUpperCase() === "HOLD"
);

*/
