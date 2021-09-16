const express = require("express");
// const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const { IS_PROD } = require("./config");
const initDB = require("./initDB");
// const corsOptions = require("./corsOptions");
require("dotenv").config(); // n4
require("./utils/globalHelpers");
require("./jobs");
// const formData = require("express-form-data");
// const sslRedirect = require("heroku-ssl-redirect");
console.log(process.env.APP_NAME);
//Init Express
const app = express();

const isProduction = IS_PROD;
console.log("env", isProduction ? "production" : "development");

initDB(true);

// MIDDLEWARES
app.use(cors()); //n2
app.use(helmet()); // protect app with secure headers
app.use(helmet.hidePoweredBy());
app.use(compression()); // compress all responses
app.use(express.json()); //n1
app.use(express.urlencoded({ extended: true }));
// app.use(formData.parse()); // for images and multimedia in forms.
// app.use(sslRedirect()); // n5

// routes
app.use("/api/altrabot", require("./routes/altrabot"));

// cron job request to keep server awaken at https://cron-job.org/en/members/jobs/
app.get("/api/cron-job/awake", (req, res) => res.json("waking server!"));
// Serve static files such as images, CSS files, and JavaScript files for the React frontend <app></app>
// isProduction && app.use(express.static(path.join(__dirname, "client/build")));
// END MIDDLEWARES

// This solves the "Not found" issue when loading an URL other than index.html.
// isProduction &&
//     app.get("/*", (req, res) => {
//         //n3
//         res.sendFile(
//             path.join(__dirname + "/client/build/index.html"),
//             (err) => {
//                 if (err) {
//                     res.status(500).send(err);
//                 }
//             }
//         );
//     });

const PORT = process.env.PORT || 6000;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});

/* ARCHIVES
<app className="u"></app>se('/api/finance', require('./routes/finance'));
app.use('/api/staff-booking', require('./routes/staffBooking'));

 */

// NOTES
// n1: bodyparser middleware - Allow the app to accept JSON on req.body || replaces body-parser package
// you can also includes "app.use(express.urlencoded({extended: false}))"
// n2: this was used before:
/*
// CORS - configure an Express server with CORS headers (because the React app is going to be published in a different port), JSON requests, and /api as the path
// app.use((req, res, next) => {
//     res.header("Access-Control-Allow-Origin", "*");
//     res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
//     res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
//     next();
// });
 */
// n3 : resource: https://tylermcginnis.com/react-router-cannot-get-url-refresh/
// prior setting:
/* app.use(express.static(path.join(__dirname, 'client/build')))
// CORS - configure an Express server with CORS headers (because the React app is going to be published in a different port), JSON requests, and /api as the path
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    next();
});
// Anything that doesn't match the above, send back index.html
// app.get('*', (req, res) => {
//     res.sendFile(path.join(__dirname + 'client/build/index.html')) // the "not found" issue may be occured becase of this path. client requires a slash before.
// })
n4: environment varibles works everywhere with dotenv, including controllers
n5: SSL - secure sockets layer, always redirect to https page.
*/
