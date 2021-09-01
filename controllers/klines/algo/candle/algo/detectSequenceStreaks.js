const sortArray = require("../../../../../utils/array/sortArray");
const keepSameSequence = require("../../../../../utils/array/keepSameSequence");
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

function detectSequenceStreaks(data) {
    if (!data) return {};

    const readyData = data.map((each) => {
        return {
            timestamp: each.timestamp,
            side: each.isBullish ? "bull" : "bear",
            closePrice: each.close,
        };
    });

    // LOWER WING
    const liveCandle = readyData.slice(-1)[0];
    const currPrice = liveCandle.closePrice;

    const lowestPrices = sortArray(readyData, {
        sortBy: "lowest",
        target: "closePrice",
    });
    const lowerWing20 = {
        timestamp: lowestPrices[0].timestamp,
        closePrice: lowestPrices[0].closePrice,
        diffCurrPrice: Number(
            Number(currPrice - lowestPrices[0].closePrice).toFixed(2)
        ),
    };
    // END LOWER WING

    // SEQUENCE STREAK
    // identify the start of a sequence with:
    // - at least 3 sequences.
    // - sequenceA not equal to sequenceB and sequenceB and sequenceC are equal. e.g ["bull", "bear", "bear"] or ["bear", "bull", "bull"]
    // - ["bear" (end prior sequence), "bull" (start of a new sequence), "bull"] - the sequenceB should be marked as the start point and also determine the last candle sequence of prior one which should be marked for candle sequenceA
    // const lastThreeCandles = [];
    // const currSequence = [];
    // const MAX_SEQUENCE_ANALYSIS = 3;
    // readyData.forEach(sequence => {
    //     keepSameSequence(sequence, { maxArray: MAX_SEQUENCE_ANALYSIS, array: lastThreeCandles })

    //     const isValidSequence = lastThreeCandles.length >= MAX_SEQUENCE_ANALYSIS;
    //     if(!isValidSequence) return null;
    //     // currSequence.push(sequence);

    //     const sequenceA = lastThreeCandles[2].side;
    //     console.log("sequenceA", sequenceA);
    //     const sequenceB = lastThreeCandles[1].side;
    //     const sequenceC = lastThreeCandles[0].side;

    //     // const detectedSequence = sequenceA === sequenceB && sequenceB !== sequenceC;
    //     // if(detectedSequence) currSequence.push(lastThreeCandles);
    // })
    // END SEQUENCE STREAK

    let streakBuilder = [];
    const finalSequenceStreak = [];

    readyData.forEach((candle, ind) => {
        const isLastCandle = ind + 1 === readyData.length;
        streakBuilder.push(candle);
        if (streakBuilder.length < 3) return;

        // FILTER OUT - filter out all bearish in the row. Keep only if one bear though
        let thisPriorCandle = "";
        let timestampsCandlesToBeRemoved = [];
        let tempTimestamps = [];
        let needCollection = false;
        streakBuilder.forEach((c) => {
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

        streakBuilder = streakBuilder.filter(
            (c) => !timestampsCandlesToBeRemoved.includes(c.timestamp)
        );
        const startsWithBear =
            streakBuilder.length && streakBuilder[0].side === "bear";
        if (startsWithBear) streakBuilder = streakBuilder.slice(1);
        // END FILTER OUT

        if (isLastCandle) needCollection = true;

        if (needCollection) {
            const endsWithBear =
                streakBuilder.length &&
                streakBuilder.slice(-1)[0].side === "bear";
            if (endsWithBear) streakBuilder = streakBuilder.slice(0, -1);
            if (streakBuilder.length >= 2) {
                const { closePrice, timestamp } = streakBuilder[0];

                finalSequenceStreak.push({
                    closePrice,
                    timestamp,
                });

                streakBuilder = [];
            }
        }
    });

    console.log("streakBuilder", streakBuilder);
    console.log("finalSequenceStreak", finalSequenceStreak);
    return {
        sequenceStreaks: null,
        lowerWing20,
    };
}

module.exports = detectSequenceStreaks;

/* e.g
// const res = detectSequenceStreaks(thread, { currPrice: 172000 });
// console.log("res", res);
[ { candlesCount: 6,
       lowerWing: '"2021-07-05T16:00:00.000Z"',
       higherWing: '"2021-07-05T21:00:00.000Z"',
       resistencePrice: 175687.92,
       supportPrice: 171905.06,
       isKeySupport: false,
       isKeyResistence: false },
     { candlesCount: 6,
       lowerWing: '"2021-07-06T11:00:00.000Z"',
       higherWing: '"2021-07-06T16:00:00.000Z"',
       resistencePrice: 176694.27,
       supportPrice: 173601.3,
       isKeySupport: false,
       isKeyResistence: false },
     { candlesCount: 9,
       lowerWing: '"2021-07-06T00:00:00.000Z"',
       higherWing: '"2021-07-06T08:00:00.000Z"',
       resistencePrice: 178152.2,
       supportPrice: 173663.51,
       isKeySupport: false,
       isKeyResistence: false },
     { candlesCount: 23,
       lowerWing: '"2021-07-06T19:00:00.000Z"',
       higherWing: '"2021-07-07T17:00:00.000Z"',
       resistencePrice: 182780.39,
       supportPrice: 176234.64,
       isKeySupport: false,
       isKeyResistence: false } ],

 */
