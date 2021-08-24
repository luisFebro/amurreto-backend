const unwind = require("./unwind");
// for subarrays pagination
// need $list and $listTotal in prior aggregation pipeline
// do not forget to set the data to be read like list && list[0]. useApiList reads object instead of array
function skipLimitSort({ skip, limit, list, sort, addListTotal }) {
    const { finalSkip, finalLimit } = getFinalChunks(skip, limit);

    if (list)
        return {
            $group: {
                _id: null,
                list: {
                    $push: list, // e.g "$my.list"
                },
                listTotal: { $sum: 1 },
            },
        };

    if (sort)
        return {
            $sort: sort,
        };

    if (addListTotal) {
        return {
            $addFields: {
                listTotal: {
                    $size: "$list",
                },
            },
        };
    }

    return {
        $project: {
            _id: 0,
            list: { $slice: ["$list", finalSkip, finalLimit] },
            listTotal: "$listTotal",
            chunksTotal: { $ceil: { $divide: ["$listTotal", Number(limit)] } },
        },
    };
}

// for lists use skip, limit with mongodb
function checkEmptyList(data = []) {
    const listData = (data.length && data[0].list) || (data && data.list);

    const isEmptyList = JSON.stringify(listData) === "[{}]" || !listData;
    if (isEmptyList) return { list: [], listTotal: 0, chunksTotal: 0 };
    return false;
}

// avoid errors if there are no items
function replaceWith(elem) {
    // e.g $list
    return {
        $replaceWith: { $ifNull: [elem, {}] },
    };
}

/*
required to be used like:
and mainAggr must returns a list which is an array with objects to be enlisted.
const userData = await User("cliente")
    .aggregate([...mainAggr, ...handleList({ skip, limit })]);
*/
function handleList(options = {}) {
    const { limit = 5, skip = 0, sort = { createdAt: -1 } } = options;

    return [
        unwind("$list"),
        replaceWith("$list"),
        {
            $sort: sort, // e.g should be obj like { "updateAt": -1 }
        },
        {
            $group: {
                _id: null,
                list: { $push: "$$ROOT" },
            },
        },
        skipLimitSort({ addListTotal: true }),
        skipLimitSort({
            limit,
            skip,
        }),
    ];
}

module.exports = {
    handleList,
    skipLimitSort,
    checkEmptyList,
    replaceWith,
};

// HELPERS
function getFinalChunks(skip, limit) {
    const handleLimit = () => {
        if (limit === 1) return skip + 1;
        if (skip) return limit * (skip + 1);
        return limit;
    };

    const finalSkip = limit * skip;
    const finalLimit = handleLimit();

    return { finalSkip, finalLimit };
}
// END HELPERS
