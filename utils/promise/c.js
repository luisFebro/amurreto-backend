// catch a promise to handle errors better
// https://stackoverflow.com/questions/40884153/try-catch-blocks-with-async-await
// useful for multiple promises with many nested catches

/* USAGE
 const [err, data] = await catchEm(asyncFunction(arg1, arg2));
  if (err) return handle errors

  // do stuff

 */

function c(promise) {
    return promise.then((data) => [null, data]).catch((err) => [err]);
}

module.exports = c;
