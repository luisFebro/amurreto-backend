const firstSpaceInd = { $indexOfBytes: ["$name", " "] };
const firstNameQuery = { $substr: ["$name", 0, "$$firstSpaceInd"] };

function capitalizeQuery(nameQuery = "$name") {
    return {
        $let: {
            vars: { firstSpaceInd },
            in: {
                $concat: [
                    { $toUpper: { $substr: [nameQuery, 0, 1] } },
                    {
                        $substr: [
                            firstNameQuery,
                            1,
                            { $strLenBytes: firstNameQuery },
                        ],
                    },
                ],
            },
        },
    };
}

module.exports = capitalizeQuery;
