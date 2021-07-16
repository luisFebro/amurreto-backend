const ccxt = require("ccxt"); // CryptoCurrency eXchange Trading
const accessKey = process.env.NOVADAX_ACCESS_KEY;
const secretKey = process.env.NOVADAX_SECRET_KEY;

const novadax = new ccxt.novadax({
    apiKey: accessKey,
    secret: secretKey,
});

module.exports = novadax;
