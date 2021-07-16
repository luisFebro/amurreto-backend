const express = require("express");
const router = express.Router();
// const mwCors = require("../../controllers/auth/mwCors");
// const {
//     mwIsAuth,
// } = require("../controllers/auth");

// route api/altrabot
const { readTradesHistory } = require("../controllers/dbTrades");
const { getTradingSymbol } = require("../controllers/basicInfo");
const {
    getCandlesticksData,
} = require("../controllers/klines/candlesticks");

router.get("/basic/trading-symbol", getTradingSymbol); //  mwCors,
router.get("/candlesticks", getCandlesticksData); //  mwCors,
router.get("/trades/history", readTradesHistory); //  mwCors,

module.exports = router;
