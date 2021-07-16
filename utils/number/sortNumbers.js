/**
 * [sortNumbers]
 * @param  {Array} dates [an array with objects]
 * @param  {String} sortBy
 * @param  {String} target [the element which is a number field to be sorted like value]
 * @return {Array} Array with sorted elements
 */
function sortNumbers(dataArray, options = {}) {
    const { sortBy = "highest", target = "value" } = options;

    const validSort = ["highest", "lowest"];
    if (!validSort.includes(sortBy))
        return console.log("sortBy can only be these values: " + validSort);

    if (sortBy === "highest") {
        dataArray.sort((a, b) => b[target] - a[target]);
    } else {
        dataArray.sort((a, b) => a[target] - b[target]);
    }

    return dataArray;
}

module.exports = sortNumbers;
