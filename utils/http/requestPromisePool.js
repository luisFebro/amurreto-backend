const PromisePool = require("@supercharge/promise-pool");

// returns a promise with object { results, error }
async function requestPromisePool(data, options = {}) {
    // n1
    const { promise, batchSize = 10, getParams, secondParam } = options;

    return await PromisePool.for(data)
        .withConcurrency(batchSize)
        .process(async (eachElem) => {
            let firstParam = eachElem;

            if (typeof getParams === "function") {
                firstParam = getParams(firstParam);
            }

            let res;
            if (secondParam) {
                res = await promise(firstParam, secondParam);
            } else {
                res = await promise(firstParam);
            }

            return res;
        });
}

module.exports = requestPromisePool;

/*ex:
const timeOut = (t) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(`Completed in ${t}`)
    }, t)
  })
}

const times = [1000, 2000, 3000]

requestPromisePool(times, { promise: timeOut }).then(res => console.log(res));
*/

/* COMMENTS
n1: docs: https://superchargejs.com/docs/master/promise-pool

Error Handling
The promise pool won’t throw when running into an error while processing an item. It saves the error to be inspected later. You’ve access to the item causing the error using error.item.
*/
