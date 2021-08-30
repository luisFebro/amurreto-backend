const path = require("path");

// LESSON: Minimum of 30s to avoid this.. Error: Job X is already running

// Time in the server is UTC based (coordinated universal time) which means is 4 hours ahead the local time.
// if your goal is trigger at 5:00, then 9:00 am.
const jobGallery = [
    setOptions({
        name: "amurreto candlesticks update",
        filePath: "/amurreto/updateCandlesticks",
        interval: "2m",
    }),
];

function setOptions({ name, filePath, interval }) {
    return {
        name,
        path: path.join(__dirname, `${filePath}.js`), // required specify .js here... The path of the job or function used for spawning a new Worker with. If not specified, then it defaults to the value for name plus the default file extension specified under Instance Options.
        interval, //"at 5:00 am", // Sets the duration in milliseconds for the job to repeat itself, otherwise known as its interval (it overrides the default inherited interval as set in Instance Options). A value of 0 indicates it will not repeat and there will be no interval. If the value is greater than 0 then this value will be used as the interval.
    };
}
/* MORE JOB OPTIONS
timeout: "10s", // Sets the duration in milliseconds before the job starts (it overrides the default inherited timeout as set in Instance Options. A value of 0 indicates it will start immediately. This value can be a Number, String, or a Boolean of false (which indicates it will NOT inherit the default timeout from Instance Options). See Job Interval and Timeout Values below for more insight into how this value is parsed.
date: new Date(), // This must be a valid JavaScript Date (we use instance of Date for comparison). If this value is in the past, then it is not run when jobs are started (or run manually). We recommend using dayjs for creating this date, and then formatting it using the toDate() method (e.g. dayjs().add('3, 'days').toDate()). You could also use moment or any other JavaScript date library, as long as you convert the value to a Date instance here.
cron: "" // Use cases for cron jobs include backing up your database and running scripts according to a specified hour, day, month, or year. - A cron expression to use as the job's interval, which is validated against cron-validate and parsed by later.
hasSeconds:  // Boolean Overrides the Instance Options hasSeconds property if set. Note that setting this to true will automatically set cronValidate defaults to have { preset: 'default', override: { useSeconds: true } }
cronValidate: {} // Overrides the Instance Options cronValidate property if set.
closeWorkerAfterMs: 13000,  // Number  Overrides the Instance Options closeWorkerAfterMs property if set.
worker: {}// These are default options to pass when creating a new Worker instance. See the Worker class documentation for more insight.
outputWorkerMetadata: false // Overrides the Instance Options outputWorkerMetadata property if set.
 */

module.exports = { jobGallery };
