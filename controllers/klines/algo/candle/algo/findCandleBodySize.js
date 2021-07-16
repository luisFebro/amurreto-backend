function findCandleBodySize(vol) {
    const { bodyPerc, volRealBody } = vol;

    const thisRealBody = Math.abs(volRealBody);

    if (bodyPerc < 20) return "tiny";
    if (thisRealBody < 700) return "tinyVol";
    if (bodyPerc >= 20 && bodyPerc < 40) return "small";
    if (bodyPerc >= 40 && bodyPerc < 50) return "medium";
    if (bodyPerc >= 50 && bodyPerc < 60) return "mediumHigh";
    if (thisRealBody < 2000) return "mediumHighVol";
    if (bodyPerc >= 60 && bodyPerc < 80) return "large";
    if (thisRealBody < 3000) return "largeVol";
    if (bodyPerc >= 80) return "strong";

    return null;
}

module.exports = findCandleBodySize;
