function switchQuery(branchesArray, defaultCond = undefined) {
    if (!Array.isArray(branchesArray))
        throw new Error(
            "branchesArray should be array with case: and then: fields obj"
        );

    return {
        $switch: {
            branches: branchesArray,
            default: defaultCond,
        },
    };
}

module.exports = switchQuery;

/* EXAMPLES
const branches = [
    { case: "a", then: 1 },
    { case: "b", then: 2 },
    { case: "c", then: 3 },
]
const res = switchQuery(branches, "4");
*/
