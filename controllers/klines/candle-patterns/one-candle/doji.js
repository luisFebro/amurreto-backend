const isDoji = (data) => {
    const { candleA } = data;
    // const upperEqual3 = upper.toString().charAt(0) === "3";
    // const bodyEqual3 = body.toString().charAt(0) === "3";
    // const lowerEqual3 = lower.toString().charAt(0) === "3";

    // high wave doji
    // const isHighWave = upperEqual3 && lowerEqual3 && volRealBody > 2000;
    // if (isHighWave) return "dojiHighWave";

    // return upperEqual3 && bodyEqual3 && lowerEqual3;
};

module.exports = isDoji;
