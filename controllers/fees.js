const getPercentage = require("../utils/number/perc/getPercentage");
const { getConvertedPrice } = require("./helpers/convertors");

// renewals are every monthly
// novawards pro fees
// https://www.novadax.com.br/novawards
const TAKER_MARKET_FEE = 0.45; // basic is 0.5
const MAKER_LIMIT_FEE = 0.21; // basic is 0.25

// feeAmount if buy is in base currency price which is the cryptocurrency
// e.g 0,00000044 BTC (0.10%)
function getTransactionFees(options = {}) {
    const {
        isBuy = true,
        isMarket = false,
        marketPrice,
        quotePrice,
        filledFee,
    } = options;

    const feeAmount = isBuy
        ? Number(
              getConvertedPrice(marketPrice, {
                  base: filledFee,
              })
          )
        : Number(filledFee);

    const feePerc = isMarket
        ? TAKER_MARKET_FEE
        : getPercentage(quotePrice, Number(feeAmount));

    return {
        feeAmount,
        feePerc,
    };
}

// HELPERS
function checkCondLimitOrder({
    signal = "BUY",
    currCandleSize = "huge",
    isEnoughMoneyForSelling,
    // isCurrBullish = true,
}) {
    if (signal === "SELL" && !isEnoughMoneyForSelling) return false;

    const disableBearSizes = ["big", "huge"];
    const isBleedableCandle =
        signal === "SELL" && disableBearSizes.includes(currCandleSize);

    const acceptedSignals = ["BUY", "SELL"];
    const isUnauthorizedSignal = !acceptedSignals.includes(signal);

    if (isBleedableCandle || isUnauthorizedSignal) return false;

    // everything else returns true since we have the lowest fee possible;
    return true;
}
// END HELPERS

module.exports = {
    TAKER_MARKET_FEE,
    MAKER_LIMIT_FEE,
    checkCondLimitOrder,
    getTransactionFees,
};
