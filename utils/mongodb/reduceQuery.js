// [10, 20, 30] === 60
function reduceQuery(input) {
    // input should gave $
    return {
        $reduce: {
            // useful to couting numeric elemnets array like [12, 3232, 23]
            input,
            initialValue: 0,
            in: {
                $add: ["$$value", "$$this"],
            },
        },
    };
}

module.exports = reduceQuery;
