/* patterns
buy - 3InsideUp
sell - 3OutsideDown
 */

async function watchCandlePatterns() {
    return {
        signal: "BUY",
        strategy: "candlePattern3InsideUp",
        transactionPerc: 100,
    };
}

module.exports = watchCandlePatterns;
