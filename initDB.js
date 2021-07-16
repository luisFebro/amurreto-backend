const mongoose = require("mongoose");

const options = {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true, //Applied after DeprecationWarning and goal: new Server Discover and Monitoring engine || // comment this out when this error occurs: MongoTimeoutError: Server selection timed out after 30000 ms || || But be aware that things can not work properly
    useFindAndModify: false, // DeprecationWarning: Mongoose: `findOneAndUpdate()` and `findOneAndDelete()` without the `useFindAndModify` option set to false are deprecated
    keepAlive: true,
};

async function initDB(consoleOn = false) {
    await mongoose
        .connect(process.env.MONGO_KEY, options)
        .then(() => {
            consoleOn ? console.log(`MongoDB Connected...`) : "";
        })
        .catch((err) => console.log(err));
}

module.exports = initDB;
