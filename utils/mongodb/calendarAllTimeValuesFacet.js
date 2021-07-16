const reduceQuery = require("./reduceQuery");
const unwind = require("./unwind");

/* USAGE EXAMPLE
{
    $facet: { earningsAmount: calendarAllTimeValuesFacet("ceoEarnings") },
},

this returns alltime amount of a field which has no end calendar range with monthes
 */

const calendarAllTimeValuesFacet = (field) => [
    {
        $match: {},
    },
    {
        $project: {
            _id: 0,
            [`${field}`]: 1,
        },
    },
    unwind(`$${field}`),
    {
        $project: {
            [`${field}`]: getMapFilter(field),
        },
    },
    {
        $group: {
            _id: null,
            value: { $sum: reduceQuery(`$${field}`) },
        },
    },
    {
        $project: {
            _id: 0,
            value: "$value",
        },
    },
];

// HELPERS
function getFilter(thisField) {
    return {
        $filter: {
            input: {
                $objectToArray: `$${thisField}.monthes`,
            },
            as: "elem",
            cond: {
                $gt: [{ $first: "$$elem.v.value" }, 0],
            },
        },
    };
}

function getMapFilter(field) {
    return {
        $map: {
            input: {
                ...getFilter(field),
            },
            as: "elem",
            in: {
                $reduce: {
                    // useful to couting numeric elemnets array like [12, 3232, 23]
                    input: "$$elem.v.value",
                    initialValue: 0,
                    in: {
                        $add: ["$$value", "$$this"],
                    },
                },
            },
        },
    };
}
// END HELPERS

module.exports = calendarAllTimeValuesFacet;
