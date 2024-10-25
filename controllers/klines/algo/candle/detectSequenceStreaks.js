const sortArray = require("../../../../utils/array/sortArray");
const sortDates = require("../../../../utils/dates/sortDates");
const { getDiffInMinutes } = require("../../../../utils/dates/dateFnsBack");
// const { findResistenceSupportWings } = require("./findResistenceSupportWings");

/* e.g
dataSide = {
    timestamp: 23214,
    side: bull,
    closePrice: 245.000,
}
 */

// sequenceStreaks
/* RULES
- every streak starts and end with 2 candles of the same kind in the row.

- detect the last 20 candles

- the sequence orders are identified by letters followed by number of candles and predominant side
A.bulls.10|B.bears.5|C.bulls.5

- lowerWingPrice will be a parameter to detect a merge in price where no other strategy was detect
for instance, if the lowerWingPrice is 172.000 and the price goes to above 174.500 and got at least 2 bullish candles, then we can buy because is probably a missing opportunity from other strategies.
also can be used to determine the support of the current market
*/

// returns { sequenceStreaks, lowerWingPrice }

function detectSequenceStreaks(data, options = {}) {
    if (!data) return {};
    const { maxPerc, lastProfitRow = [] } = options;

    const readyData = data.map((each) => {
        return {
            candleSize: each.candleBodySize,
            timestamp: each.timestamp,
            side: each.isBullish ? "bull" : "bear",
            closePrice: each.close,
            lowestPrice: each.lowest,
        };
    });

    // SEQUENCE STREAK
    let bullStreakBuilder = [];
    const bullSequenceStreaks = [];
    let allBullishCandles = []; // use it for get all other bearish candles and sequence since we need them in this new algo

    readyData.forEach((candle, ind) => {
        const isLastCandle = ind + 1 === readyData.length;
        bullStreakBuilder.push(candle);
        if (bullStreakBuilder.length < 2) return;

        // FILTER OUT - filter out all bearish in the row. Keep only if one bear though
        let thisPriorCandle = "";
        let timestampsCandlesToBeRemoved = [];
        let tempTimestamps = [];
        let needCollection = false;
        bullStreakBuilder.forEach((c) => {
            const removeFromStreak =
                thisPriorCandle === "bear" && c.side === "bear";

            tempTimestamps.push(c.timestamp);
            thisPriorCandle = c.side;

            // push the last bearish sequence in the row.
            if (removeFromStreak) {
                timestampsCandlesToBeRemoved = [
                    ...new Set([
                        ...timestampsCandlesToBeRemoved,
                        ...tempTimestamps.slice(-2),
                    ]),
                ];
                needCollection = true;
            }
        });

        bullStreakBuilder = bullStreakBuilder.filter(
            (c) => !timestampsCandlesToBeRemoved.includes(c.timestamp)
        );
        const startsWithBear =
            bullStreakBuilder.length && bullStreakBuilder[0].side === "bear";
        if (startsWithBear) bullStreakBuilder = bullStreakBuilder.slice(1);
        // END FILTER OUT

        if (isLastCandle) needCollection = true;

        if (needCollection) {
            const startWith2Bulls = Boolean(
                bullStreakBuilder.length &&
                    bullStreakBuilder[0].side === "bull" &&
                    bullStreakBuilder[1] &&
                    bullStreakBuilder[1].side === "bull"
            );
            if (!startWith2Bulls) bullStreakBuilder = [];
            // const endsWithBear =
            //     bullStreakBuilder.length &&
            //     bullStreakBuilder.slice(-1)[0].side === "bear";
            // if (endsWithBear) bullStreakBuilder = bullStreakBuilder.slice(0, -1);
            if (bullStreakBuilder.length >= 2) {
                allBullishCandles = [
                    ...allBullishCandles,
                    ...bullStreakBuilder,
                ];
                bullSequenceStreaks.push({
                    sequence: "bull",
                    count: bullStreakBuilder.length,
                    startTimeStamp: bullStreakBuilder[0].timestamp,
                });
                bullStreakBuilder = [];
            }
        }
    });

    const allBullishTimestamps = allBullishCandles.map((s) => s.timestamp);
    const allBearishCandles = readyData.filter(
        (s) => !allBullishTimestamps.includes(s.timestamp)
    );

    let bearStreakBuilder = [];
    const bearSequenceStreaks = [];
    allBearishCandles.forEach((c, ind) => {
        bearStreakBuilder.push(c);

        const lastTimestamp = bearStreakBuilder.slice(-2)[0].timestamp;
        const currTimestamp = c.timestamp;
        const diffMinTimestamps = getDiffInMinutes(lastTimestamp, {
            laterDate: currTimestamp,
        });

        // if there is a bear, bear, bull, bear sequence...
        // the bull is considered as bear and thusly the diffMinTimestamps should be 60 not 120 as if there is a gab because it is bull
        const FRAMETIME_MIN = 60;
        const isLastCandle = ind + 1 === allBearishCandles.length;
        const isNewSequence = diffMinTimestamps > FRAMETIME_MIN;
        // the minimum of a valid range is 3 candles, two bearish in one and the last in the next. If only two, it means there is a leftover candle with no pair
        // this verification only need to the first tip of the sequence. that's why an ind cond to verify if it is the first candles
        const detectedAloneBearishCandle =
            ind <= 2 && isNewSequence && bearStreakBuilder.length === 2;
        if (detectedAloneBearishCandle)
            bearStreakBuilder = [bearStreakBuilder.slice(-1)[0]];

        if (bearStreakBuilder.length < 2) return;

        if (isNewSequence || isLastCandle) {
            // remove the last for the next sequence
            // if last one, does not need to slice anything
            const finalBearSequenceStreaks = isLastCandle
                ? bearStreakBuilder
                : bearStreakBuilder.slice(0, -1);
            bearSequenceStreaks.push({
                sequence: "bear",
                count: finalBearSequenceStreaks.length,
                startTimeStamp: finalBearSequenceStreaks[0].timestamp,
            });

            // let only the last candle to the next sequence
            bearStreakBuilder = isLastCandle ? [] : bearStreakBuilder.slice(-1);
        }
    });
    const allSequences = sortDates(
        [...bullSequenceStreaks, ...bearSequenceStreaks],
        { sortBy: "latest", target: "startTimeStamp" }
    );
    const sequenceStreaks = getStringifiedSequences(allSequences);
    // END SEQUENCE STREAK

    const liveCandle = readyData.slice(-1)[0];
    const currPrice = liveCandle && liveCandle.closePrice;

    // LOWER WING
    const lowestPrices = sortArray(readyData, {
        sortBy: "lowest",
        target: "closePrice",
    });

    const lowerWing = {
        timestamp: lowestPrices[0].timestamp,
        closePrice: lowestPrices[0].closePrice,
        diffCurrPrice: Number(
            Number(currPrice - lowestPrices[0].closePrice).toFixed(2)
        ),
    };
    // END LOWER WING

    // HIGHER WING
    const highestPrices = sortArray(readyData, {
        sortBy: "highest",
        target: "closePrice",
    });

    const higherWing = {
        timestamp: highestPrices[0].timestamp,
        closePrice: highestPrices[0].closePrice,
        diffCurrPrice: Number(
            Number(highestPrices[0].closePrice - currPrice).toFixed(2)
        ),
    };
    // END HIGHER WING

    // BIG and HUGE candles for stoploss reference
    let stoplossBigCandles = [];
    readyData.forEach((c) => {
        // set medium candle sizes to be detected to be more sensible to downtrend change
        const lossesSequence = lastProfitRow.length
            ? lastProfitRow.every((t) => t === false)
            : false;
        const goalProfit = lossesSequence ? 1 : 3;

        const enoughProfit = maxPerc >= goalProfit;
        const allowedCandleSizes = enoughProfit
            ? ["big", "huge", "medium"]
            : ["big", "huge"];
        const isBullish = c.side === "bull";
        // this isLowThanCurrPrice prevents upper detected candles to be detected and thus making the stop loss useless
        const isLowThanCurrPrice = c.lowestPrice < currPrice;
        if (!isBullish || !allowedCandleSizes.includes(c.candleSize))
            return null;

        return stoplossBigCandles.push({
            timestamp: c.timestamp,
            lowest: c.lowestPrice,
            candleSize: c.candleSize,
            isLowThanCurrPrice,
        });
    });

    stoplossBigCandles = sortDates(stoplossBigCandles, {
        sortBy: "latest",
        target: "timestamp",
    });

    return {
        sequenceStreaks,
        lowerWing,
        higherWing,
        stoplossGrandCandle: stoplossBigCandles.length
            ? stoplossBigCandles[0]
            : null,
    };
}

// HELPERS
function getStringifiedSequences(allSequences = []) {
    if (!allSequences.length) return "";

    const letters = [
        "A",
        "B",
        "C",
        "D",
        "E",
        "F",
        "G",
        "H",
        "I",
        "J",
        "K",
        "L",
        "M",
        "N",
        "O",
        "P",
    ];

    // e.g A.bulls.10|B.bears.5|C.bulls.5
    let finalSequenceString = "";
    allSequences.forEach((s, ind) => {
        const currLetter = letters[ind];
        const side = `${s.sequence}s`;
        const count = s.count;
        finalSequenceString += `${currLetter}.${side}.${count}|`;
    });

    return finalSequenceString;
}
// END HELPERS

module.exports = detectSequenceStreaks;
