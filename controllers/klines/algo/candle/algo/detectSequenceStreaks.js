const sortArray = require("../../../../../utils/array/sortArray");
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
A10bulls|B5bears|C5bulls

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

    return {
        sequenceStreaks: null,
        lowerWing20,
    };
    // let threadBuilder = [];
    // const threadCollection = [];

    // threadArray.forEach((candle, ind) => {
    //     const isLastCandle = ind + 1 === threadArray.length;
    //     threadBuilder.push(candle);
    //     if (threadBuilder.length < 3) return;

    //     // FILTER OUT - filter out all bearish in the row. Keep only if one bear though
    //     let thisPriorCandle = "";
    //     let timestampsCandlesToBeRemoved = [];
    //     let tempTimestamps = [];
    //     let needCollection = false;
    //     threadBuilder.forEach((c) => {
    //         const removeFromThread =
    //             thisPriorCandle === "bear" && c.isBullish === false;

    //         tempTimestamps.push(c.timestamp);
    //         thisPriorCandle = isBullOrBear(c);

    //         // push the last bearish sequence in the row.
    //         if (removeFromThread) {
    //             timestampsCandlesToBeRemoved = [
    //                 ...new Set([
    //                     ...timestampsCandlesToBeRemoved,
    //                     ...tempTimestamps.slice(-2),
    //                 ]),
    //             ];
    //             needCollection = true;
    //         }
    //     });

    //     threadBuilder = threadBuilder.filter(
    //         (c) => !timestampsCandlesToBeRemoved.includes(c.timestamp)
    //     );
    //     const startsWithBear =
    //         threadBuilder.length && threadBuilder[0].isBullish === false;
    //     if (startsWithBear) threadBuilder = threadBuilder.slice(1);
    //     // END FILTER OUT

    //     if (isLastCandle) needCollection = true;

    //     if (needCollection) {
    //         const endsWithBear =
    //             threadBuilder.length &&
    //             threadBuilder.slice(-1)[0].isBullish === false;
    //         if (endsWithBear) threadBuilder = threadBuilder.slice(0, -1);
    //         if (threadBuilder.length >= 2) {
    //             const higherWing = threadBuilder.slice(-1)[0].timestamp;
    //             const lowerWing = threadBuilder[0].timestamp;

    //             const resistencePrice = threadBuilder.slice(-1)[0].close;
    //             const supportPrice = threadBuilder[0].open;

    //             threadCollection.push({
    //                 candlesCount: threadBuilder.length,
    //                 lowerWing,
    //                 higherWing,
    //                 resistencePrice,
    //                 supportPrice,
    //                 isKeySupport: false,
    //                 isKeyResistence: false,
    //             });
    //             threadBuilder = [];
    //         }
    //     }
    // });

    // const dataThreads = findResistenceSupportWings(threadCollection, currPrice);

    // return dataThreads;
}

// HELPERS
function isBullOrBear(candle) {
    return candle.isBullish ? "bull" : "bear";
}
// END HELPERS

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
