async function getProfitTrackerSignal({ profitTracker = {} }) {
    if (!profitTracker.watching) return { signal: null };
    const {
        watching,
        isProfit,
        diffMax, // diff from maxPerc and netPerc
        diffVolat,
        netPerc,
        // maxPerc,
        // minPerc,
    } = profitTracker;

    if (!watching) return { signal: null };

    const MAX_DIFF_VOLAT_PERC = 2; // diff between maxPerc and minPerc from profit

    const maxProfitStopLoss = !isProfit && diffVolat >= MAX_DIFF_VOLAT_PERC;
    if (maxProfitStopLoss) {
        return {
            signal: "SELL",
            strategy: "maxStopLoss",
            transactionPerc: 100,
        };
    }

    // condition for sale if diffVolat reaches 1.0

    // PROFIT HANDLING
    const MAX_DIFF_START_PROFIT = 0.3;
    const MAX_DIFF_MID_PROFIT = 0.5;
    const MAX_DIFF_LONG_PROFIT = 0.7;
    const startProfitRange = netPerc >= 0 && netPerc < 0.5;
    const midProfitRange = netPerc >= 0.5 && netPerc < 1.5;
    const longProfitRange = netPerc >= 1.5;

    const isStartProfit =
        startProfitRange && diffMax >= MAX_DIFF_START_PROFIT && "startProfit";
    const isMidProfit =
        midProfitRange && diffMax >= MAX_DIFF_MID_PROFIT && "midProfit";
    const isLongProfit =
        longProfitRange && diffMax >= MAX_DIFF_LONG_PROFIT && "longProfit";
    const profitRange = isStartProfit || isMidProfit || isLongProfit;

    if (isProfit && profitRange) {
        return {
            signal: "SELL",
            strategy: profitRange,
            transactionPerc: 100,
        };
    }
    // END PROFIT HANDLING

    // empty signal handle with strategiesManager
    return { signal: null };
}

module.exports = getProfitTrackerSignal;

/*

{ watching: true,
  transactionId: 612e08b73f7d6a0016259c5d,
  isProfit: false,
  maxPerc: 0.29,
  netPerc: -2.02,
  minPerc: -2.03,
  diffMax: 2.31,
  diffVolat: 2.32 }

 */
