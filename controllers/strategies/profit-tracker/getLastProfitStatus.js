const AmurretoOrders = require("../../../models/Orders");

async function getLastProfitStatus() {
    const transactionData = await AmurretoOrders.aggregate([
        {
            $match: {
                status: "done",
            },
        },
        {
            $sort: {
                updatedAt: -1,
            },
        },
        {
            $group: {
                _id: null,
                list: {
                    $push: "$$ROOT",
                },
            },
        },
        {
            $project: {
                list: {
                    $slice: ["$list.profitTracker.netPerc", 2],
                },
            },
        },
    ]);

    const lastNetPerc = transactionData.length ? transactionData[0].list : [];

    const finalData = lastNetPerc.map((status) => {
        const isProfitable = status > 0;
        // [1.3 (last), 1.5 (lastButOne)] and so on...
        return isProfitable;
    });

    return finalData;
}

module.exports = getLastProfitStatus;
