const threads = require("bthreads");
const initDB = require("../initDB");

initDB();

const DONE_STATUS = "done"; // LESSON: this always should be done, otherwise Error: Job "sendUserBirthday" is already running
const CANCELLED_STATUS = "cancelled";

let isCancelled = false;
const parentPort = threads.parentPort;

function cancel() {
    // do cleanup here
    // (if you're using @ladjs/graceful, the max time this can run by default is 5s)

    // send a message to the parent that we're ready to terminate
    // (you could do `process.exit(0)` or `process.exit(1)` instead if desired
    // but this is a bit of a cleaner approach for worker termination
    if (parentPort) parentPort.postMessage(CANCELLED_STATUS);
    else process.exit(0);
}

if (parentPort) {
    parentPort.once("message", (message) => {
        if (message === "cancel") {
            isCancelled = true;
            cancel();
        }
    });
}

function setDone() {
    // Signal to the main thread that the process has completed by sending a "done" message (per the example above in Writing jobs with Promises and async-await
    if (parentPort) parentPort.postMessage(DONE_STATUS);
    else process.exit(0);
}

module.exports = { isCancelled, setDone };
