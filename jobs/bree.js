const Bree = require("bree");
const { jobGallery } = require("./jobs");
const { IS_DEV } = require("../config");
/* CRON-JOBS DEFINITION
The software utility cron also known as cron job is a time-based job scheduler in Unix-like computer operating systems. Users who set up and maintain software environments use cron to schedule jobs (commands or shell scripts) to run periodically at fixed times, dates, or intervals.
 */

/*
NOTE: If you are using Node versions prior to Node v11.7.0, then in your worker files – you will need to use bthreads instead of workers. For example, you will const thread = require('bthreads'); at the top of your file, instead of requiring worker_threads. This will also require you to install bthreads in your project with npm install bthreads or yarn add bthreads.
 */

const bree = new Bree({
    // logger: new Cabin(),
    errorHandler: (error, meta) => console.log([error, meta]), // Set this function to receive a callback when an error is encountered during worker execution (e.g. throws an exception) or when it exits with non-zero code (e.g. process.exit(1)). The callback receives two parameters error and workerMetadata. Important note, when this callback is present default error logging will not be executed.
    // workerMessageHandler: (name, msg) => console.log([name, msg]), // Already being used inside function Set this function to receive a callback when a worker sends a message through parentPort.postMessage. The callback receives at least two parameters name (of the worker) and message (coming from postMessage), if outputWorkerMetadata is enabled additional metadata will be sent to this handler.
    jobs: jobGallery,
});

bree.on("worker created", (name) => {
    const triggeredTimes = bree.workers[name].threadId;
    console.log(`trigger N* ${triggeredTimes} at ${new Date()}`);
});

// start/stop all jobs (this is the equivalent of reloading a crontab):
bree.start();

const activateDev = false;
if (IS_DEV && !activateDev) {
    bree.stop();
}

module.exports = bree;

/* MORE BREE INSTANCE OPTIONS
// start only a specific job:
//bree.start('foo');

// stop only a specific job:
//bree.stop('beep');

// run all jobs (this does not abide by timeout/interval/cron and spawns workers immediately)
// bree.run();

// run a specific job (...)
// bree.run('beep');

// add a job array after initialization:
// bree.add(['boop']);
// this must then be started using one of the above methods

// add a job after initialization:
// bree.add('boop');
// this must then be started using one of the above methods

// remove a job after initialization:
// bree.remove('boop');
 */

/* EXEMPLES
jobs: [
    // runs `./jobs/foo.js` on start
    'foo',

    // runs `./jobs/foo-bar.js` on start
    {
      name: 'foo-bar'
    },

    // runs `./jobs/some-other-path.js` on start
    {
      name: 'beep',
      path: path.join(__dirname, 'jobs', 'some-other-path')
    },

    // runs `./jobs/worker-1.js` on the last day of the month
    {
      name: 'worker-1',
      interval: 'on the last day of the month'
    },

    // runs `./jobs/worker-2.js` every other day
    {
      name: 'worker-2',
      interval: 'every 2 days'
    },

    // runs `./jobs/worker-3.js` at 10:15am and 5:15pm every day except on Tuesday
    {
      name: 'worker-3',
      interval: 'at 10:15 am also at 5:15pm except on Tuesday'
    },

    // runs `./jobs/worker-4.js` at 10:15am every weekday
    {
      name: 'worker-4',
      cron: '15 10 ? * *'
    },

    // runs `./jobs/worker-5.js` on after 10 minutes have elapsed
    {
      name: 'worker-5',
      timeout: '10m'
    },

    // runs `./jobs/worker-6.js` after 1 minute and every 5 minutes thereafter
    {
      name: 'worker-6',
      timeout: '1m',
      interval: '5m'
      // this is unnecessary but shows you can pass a Number (ms)
      // interval: ms('5m')
    },

    // runs `./jobs/worker-7.js` after 3 days and 4 hours
    {
      name: 'worker-7',
      // this example uses `human-interval` parsing
      timeout: '3 days and 4 hours'
    },

    // runs `./jobs/worker-8.js` at midnight (once)
    {
      name: 'worker-8',
      timeout: 'at 12:00 am'
    },

    // runs `./jobs/worker-9.js` every day at midnight
    {
      name: 'worker-9',
      interval: 'at 12:00 am'
    },

    // runs `./jobs/worker-10.js` at midnight on the 1st of every month
    {
      name: 'worker-10',
      cron: '0 0 1 * *'
    },

    // runs `./jobs/worker-11.js` at midnight on the last day of month
    {
      name: 'worker-11',
      cron: '0 0 L * *'
    },

    // runs `./jobs/worker-12.js` at a specific Date (e.g. in 3 days)
    {
      name: 'worker-12',
      // <https://github.com/iamkun/dayjs>
      date: dayjs().add(3, 'days').toDate()
      // you can also use momentjs
      // <https://momentjs.com/>
      // date: moment('1/1/20', 'M/D/YY').toDate()
      // you can pass Date instances (if it's in the past it will not get run)
      // date: new Date()
    },

    // runs `./jobs/worker-13.js` on start and every 2 minutes
    {
      name: 'worker-13',
      interval: '2m'
    },

    // runs `./jobs/worker-14.js` on start with custom `new Worker` options (see below)
    {
      name: 'worker-14',
      // <https://nodejs.org/api/worker_threads.html#worker_threads_new_worker_filename_options>
      worker: {
        workerData: {
          foo: 'bar',
          beep: 'boop'
        }
      }
    },

    // runs `./jobs/worker-15.js` **NOT** on start, but every 2 minutes
    {
      name: 'worker-15',
      timeout: false, // <-- specify `false` here to prevent default timeout (e.g. on start)
      interval: '2m'
    },

    // runs `./jobs/worker-16.js` on January 1st, 2022
    // and at midnight on the 1st of every month thereafter
    {
      name: 'worker-16',
      date: dayjs('1-1-2022', 'M-D-YYYY').toDate(),
      cron: '0 0 1 * *'
    }
  ]
});

 */
