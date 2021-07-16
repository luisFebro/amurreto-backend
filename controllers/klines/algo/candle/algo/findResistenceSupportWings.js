const sortNumbers = require("../../../../../utils/number/sortNumbers");

function findResistenceSupportWings(threadCollection, currPrice) {
    // the target price will be the next key resistence or wing to highest to detect the next resistence from current price.
    // the target price will be the next key support or wing
    // wings are intermiate goals, but key levels are the final trading goal and where certainly will be some degree of reversal
    const resistencePrices = sortNumbers(threadCollection, {
        sortBy: "lowest",
        target: "resistencePrice",
    }).map((re) => re.resistencePrice);
    const supportPrices = sortNumbers(threadCollection, {
        sortBy: "lowest",
        target: "supportPrice",
    }).map((re) => re.supportPrice);
    const keyResistence = resistencePrices.slice(-1)[0];
    const keySupport = supportPrices[0];

    // console.log("supportPrices", supportPrices);
    let nextResistence = null;
    let nextSupport = null;

    // supportPrices [ 171905.06, 173601.3, 173663.51, 176234.64 ]
    // resistencePrices [ 175687.92, 176694.27, 178152.2, 182780.39 ]
    let lastResistence = 0;
    let lastSupport = 0;
    resistencePrices.forEach((resistence, ind) => {
        if (currPrice >= lastResistence && currPrice < resistence)
            nextResistence = resistence;

        const currSupport = supportPrices[ind];
        if (lastSupport <= currPrice && currPrice > currSupport)
            nextSupport = currSupport;

        // if the current price crosses all resistences, then get the key resistence.
        const isLast = ind + 1 === resistencePrices.length;
        if (isLast && !nextResistence) nextResistence = keyResistence;
        if (isLast && !nextSupport) nextSupport = keySupport;
        lastResistence = resistence;
        lastSupport = currSupport;
    });

    const finalThreadCollection = threadCollection.map((thread) => {
        const isKeySupport = keySupport === thread.supportPrice;
        const isKeyResistence = keyResistence === thread.resistencePrice;

        if (isKeySupport || isKeyResistence) {
            return {
                ...thread,
                isKeySupport,
                isKeyResistence,
            };
        }

        return thread;
    });

    return {
        threads: finalThreadCollection,
        nextResistence,
        nextSupport,
        keyResistence,
        keySupport,
    };
}

function checkWingForCandle(candle, threads) {
    const candleTimestamp = JSON.stringify(candle.timestamp);

    let isHigherWing = false;
    let isLowerWing = false;
    let isKeyResistence = false;
    let isKeySupport = false;
    let threadsCount = 0;

    threads.forEach((th) => {
        const isThisUpperWing = th.higherWing === candleTimestamp;
        const isThisLowerWing = th.lowerWing === candleTimestamp;

        if (isThisLowerWing || isThisUpperWing) {
            if (isThisUpperWing) {
                isHigherWing = true;
                threadsCount = th.candlesCount;
                isKeyResistence = th.isKeyResistence;
            }
            if (isThisLowerWing) {
                isLowerWing = true;
                isKeySupport = th.isKeySupport;
            }
        }
    });

    return {
        threadsCount,
        isHigherWing,
        isLowerWing,
        isKeyResistence,
        isKeySupport,
    };
}

module.exports = {
    findResistenceSupportWings,
    checkWingForCandle,
};
