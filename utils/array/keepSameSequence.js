const array = [];
// it should be inside a loop.

function keepSameSequence(payload, options = {}) {
    const { maxArray = 3, mostRecent = "first" } = options;

    const mostRecentAllow = ["last", "first"];
    if (!mostRecentAllow.includes(mostRecent))
        throw new Error("Invalid msot recent");

    const isFirstInsert = mostRecent === "first";
    const runRemoval = () => (isFirstInsert ? array.pop() : array.shift());
    const runInsertion = () =>
        isFirstInsert ? array.unshift(payload) : array.push(payload);

    const MAX_DATA_COUNT = maxArray;

    if (array.length >= MAX_DATA_COUNT) {
        runRemoval();
        runInsertion();
        return;
    }

    runInsertion();
}

module.exports = {
    keepSameSequence,
    array,
};

// e.g
// keepSameSequence("a");
// console.log(array)
// keepSameSequence("b");
// console.log(array)
// keepSameSequence("c");
// console.log(array)
// keepSameSequence("d");
// console.log(array)
// keepSameSequence("e");
// console.log(array)
// keepSameSequence("f");
// console.log(array)

// mostRecent LAST result:
// [ 'a' ]
// [ 'a', 'b' ]
// [ 'a', 'b', 'c' ]
// [ 'b', 'c', 'd' ]
// [ 'c', 'd', 'e' ]
// [ 'd', 'e', 'f' ]

// mostRecent FIRST result:
// [ 'a' ]
// [ 'b', 'a' ]
// [ 'c', 'b', 'a' ]
// [ 'd', 'c', 'b' ]
// [ 'e', 'd', 'c' ]
// [ 'f', 'e', 'd' ]
