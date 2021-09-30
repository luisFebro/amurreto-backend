function findCandleBodySize(vol) {
    const { bodyPerc, volRealBody } = vol;

    const thisRealBody = Math.abs(volRealBody);

    if (thisRealBody >= 3500) return "huge";
    if (thisRealBody >= 2000) return "big";
    if (thisRealBody >= 1000) return "medium";
    if (thisRealBody >= 600) return "small";
    if (thisRealBody < 600) return "tiny";
    return "?";
}

module.exports = findCandleBodySize;
