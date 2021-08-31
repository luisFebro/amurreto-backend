async function getProfitTrackerSignal({ profitTracker = {} }) {
    if (!profitTracker) return { signal: null };
    const {
        watching,
        isProfit,
        diffMax,
        diffVolat,
        // maxPerc,
        // netPerc,
        // minPerc,
    } = profitTracker;

    if (!watching) return { signal: null };

    const MAX_DIFF_VOLAT_PERC = 1.5; // diff between maxPerc and minPerc from profit

    const maxProfitStopLoss = !isProfit && diffVolat >= MAX_DIFF_VOLAT_PERC;
    if (maxProfitStopLoss) {
        return {
            signal: "SELL",
            strategy: "profitMaxStopLoss",
            transactionPerc: 100,
        };
    }

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
