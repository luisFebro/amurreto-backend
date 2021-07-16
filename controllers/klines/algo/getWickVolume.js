function getWickVolume(pos = "upper", { open, max, min, close, isBullish }) {
    const isUpperWick = pos === "upper";

    if (isBullish) {
        if (isUpperWick) {
            return Number((max - close).toFixed(2));
        } else {
            return Number((open - min).toFixed(2));
        }
    } else {
        if (isUpperWick) {
            return Number((max - open).toFixed(2));
        } else {
            return Number((close - min).toFixed(2));
        }
    }
}

module.exports = getWickVolume;
