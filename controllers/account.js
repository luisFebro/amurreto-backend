const novadax = require("./exchangeAPI");

// currency should be an array like ["BRL", "BTC"] and returns { BRL: 0, BTC: 0.00050698 }
async function getBalance(currencies = []) {
    const res = await novadax.fetchBalance();

    const balanceList = {};
    currencies.forEach((curr) => {
        balanceList[curr] = {
            inOrders: res[curr].used,
            available: res[curr].total,
        };
    });

    return balanceList;
}

module.exports = {
    getBalance,
};
