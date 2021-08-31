function findCandleBodySize(vol) {
    const { bodyPerc, volRealBody } = vol;

    const thisRealBody = Math.abs(volRealBody);

    if (bodyPerc < 20 || thisRealBody < 400) return "tiny";
    if ((bodyPerc >= 20 && bodyPerc < 45) || thisRealBody < 1000)
        return "small";
    if ((bodyPerc >= 45 && bodyPerc < 60) || thisRealBody < 2000)
        return "medium";
    if ((bodyPerc >= 60 && bodyPerc < 80) || thisRealBody < 3000) return "big";
    if (bodyPerc >= 80) return "huge";

    return null;
}

module.exports = findCandleBodySize;
