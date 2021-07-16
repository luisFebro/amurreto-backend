exports.CLIENT_URL =
    process.env.NODE_ENV === "production"
        ? "https://amurreto.herokuapp.com"
        : "http://localhost:3000";

const ENVIRONMENT = process.env.NODE_ENV || "development";
exports.IS_PROD = ENVIRONMENT === "production";
exports.IS_DEV = ENVIRONMENT === "development";
