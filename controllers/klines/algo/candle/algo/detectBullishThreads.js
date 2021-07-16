const { findResistenceSupportWings } = require("./findResistenceSupportWings");

function detectBullishThreads(threadArray, options = {}) {
    const { currPrice } = options;

    let threadBuilder = [];
    const threadCollection = [];

    threadArray.forEach((candle, ind) => {
        const isLastCandle = ind + 1 === threadArray.length;
        threadBuilder.push(candle);
        if (threadBuilder.length < 3) return;

        // FILTER OUT - filter out all bearish in the row. Keep only if one bear though
        let thisPriorCandle = "";
        let timestampsCandlesToBeRemoved = [];
        let tempTimestamps = [];
        let needCollection = false;
        threadBuilder.forEach((c) => {
            const removeFromThread =
                thisPriorCandle === "bear" && c.isBullish === false;

            tempTimestamps.push(c.timestamp);
            thisPriorCandle = isBullOrBear(c);

            // push the last bearish sequence in the row.
            if (removeFromThread) {
                timestampsCandlesToBeRemoved = [
                    ...new Set([
                        ...timestampsCandlesToBeRemoved,
                        ...tempTimestamps.slice(-2),
                    ]),
                ];
                needCollection = true;
            }
        });

        threadBuilder = threadBuilder.filter(
            (c) => !timestampsCandlesToBeRemoved.includes(c.timestamp)
        );
        const startsWithBear =
            threadBuilder.length && threadBuilder[0].isBullish === false;
        if (startsWithBear) threadBuilder = threadBuilder.slice(1);
        // END FILTER OUT

        if (isLastCandle) needCollection = true;

        if (needCollection) {
            const endsWithBear =
                threadBuilder.length &&
                threadBuilder.slice(-1)[0].isBullish === false;
            if (endsWithBear) threadBuilder = threadBuilder.slice(0, -1);
            if (threadBuilder.length >= 2) {
                const higherWing = threadBuilder.slice(-1)[0].timestamp;
                const lowerWing = threadBuilder[0].timestamp;

                const resistencePrice = threadBuilder.slice(-1)[0].close;
                const supportPrice = threadBuilder[0].open;

                threadCollection.push({
                    candlesCount: threadBuilder.length,
                    lowerWing,
                    higherWing,
                    resistencePrice,
                    supportPrice,
                    isKeySupport: false,
                    isKeyResistence: false,
                });
                threadBuilder = [];
            }
        }
    });

    const dataThreads = findResistenceSupportWings(threadCollection, currPrice);

    return dataThreads;
}

// HELPERS
function isBullOrBear(candle) {
    return candle.isBullish ? "bull" : "bear";
}
// END HELPERS

module.exports = detectBullishThreads;

/* e.g
// const res = detectBullishThreads(thread, { currPrice: 172000 });
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
