function isContinuationTrend(continuationData) {
    const MAX_DIFF_CLOSE = 500;
    const MIN_COUNT = 4; // includes the current close

    if (continuationData.length < MIN_COUNT) return false;

    const diffCloseData = [];
    let lastVal = 0;

    const maxHighest = Math.max(...continuationData.map((d) => d.highest));
    continuationData.forEach((data, ind) => {
        const { close } = data;

        if (ind !== 0) {
            // check if the last candle breaks the continuation
            const isLast = continuationData.length - 1 === ind;
            if (isLast) {
                return diffCloseData.push(maxHighest > close);
            }

            const diff = Number(Math.abs(close - lastVal).toFixed(2));
            diffCloseData.push(diff <= MAX_DIFF_CLOSE);
        }
        lastVal = close;
        return null;
    });

    const finalRes = diffCloseData.every((res) => res === true);
    return finalRes;
}

module.exports = isContinuationTrend;
