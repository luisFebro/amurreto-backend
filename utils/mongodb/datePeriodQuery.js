const startOfWeek = require("date-fns/startOfWeek");
const endOfWeek = require("date-fns/endOfWeek");
const startOfMonth = require("date-fns/startOfMonth");
const endOfMonth = require("date-fns/endOfMonth");
const startOfYear = require("date-fns/startOfYear");
const endOfYear = require("date-fns/endOfYear");
const addDays = require("date-fns/addDays");
const { IS_DEV } = require("../../config");
// there is a 4 span time difference. In order to get the last 4 hours from today 2021-03-19T02:55:50.814Z (22:55)
// it should begins with 0
// They need to fixed in hour since when it reads can be in the middle of the day ignoring all other previous hours in the same day.

const { today, tomorrow } = getAccurateLocalDates();

const getDailyAggr = (field) => ({
    $and: [{ $gte: [field, today] }, { $lte: [field, tomorrow] }],
});

const getDailyQuery = (date) => {
    const startDay = date
        ? new Date(new Date(date).setUTCHours(0, 0, 0, 0))
        : today;
    const endDay = date
        ? new Date(addDays(new Date(date), 1).setUTCHours(4, 0, 0, 0))
        : tomorrow;

    return {
        $gte: new Date(startDay),
        $lte: new Date(endDay),
    };
};

const getWeeklyQuery = (date) => {
    // date will be passed a prior date
    const thisDate = date ? new Date(date) : new Date();
    const startWeek = startOfWeek(thisDate, { weekStartsOn: 1 });
    const endWeek = endOfWeek(thisDate, { weekStartsOn: 1 });

    return {
        $gte: new Date(startWeek.setUTCHours(0, 0, 0, 0)),
        $lte: new Date(endWeek),
    };
};

const getMonthlyQuery = (date) => {
    const thisDate = date ? new Date(date) : new Date();
    const startMonth = startOfMonth(thisDate);
    const endMonth = endOfMonth(thisDate);

    return {
        $gte: new Date(startMonth.setUTCHours(0, 0, 0, 0)),
        $lte: new Date(endMonth),
    };
};

const getYearlyQuery = (date) => {
    const thisDate = date ? new Date(date) : new Date();
    const startYear = startOfYear(thisDate);
    const endYear = endOfYear(thisDate);

    return {
        $gte: new Date(startYear.setUTCHours(0, 0, 0, 0)),
        $lte: new Date(endYear),
    };
};

const startWeek = startOfWeek(new Date(), { weekStartsOn: 1 });

module.exports = {
    getDailyQuery,
    getDailyAggr,
    getWeeklyQuery,
    getMonthlyQuery,
    getYearlyQuery,
    startWeek,
    today,
    tomorrow,
};

// HELPERS
function getAccurateLocalDates() {
    const nowHour = new Date().getHours();

    const today = new Date(new Date().setUTCHours(0, 0, 0, 0));
    const tomorrow = new Date(addDays(new Date(), 1).setUTCHours(4, 0, 0, 0));

    // UTC date is 4 hour ahead. Then if date hours are insde 21 and 0 the next day will be shown. To avoid that, we decrease dates here.
    // these hours reflect UTF hours
    const getCond = () => {
        if (IS_DEV) return (nowHour >= 21 && nowHour <= 23) || nowHour === 0;
        // production env
        return nowHour >= 0 && nowHour <= 4;
    };

    const needDecreaseUTCDate = getCond();
    if (needDecreaseUTCDate) {
        const fixedToday = addDays(today, -1);
        const fixedTomorrow = addDays(tomorrow, -1);
        return { today: fixedToday, tomorrow: fixedTomorrow };
    }

    return { today, tomorrow };
}
// END HELPERS

/* e.g
startWeek 2021-03-15T04:00:00.000Z
endWeek 2021-03-22T03:59:59.999Z

startMonth 2021-03-01T04:00:00.000Z
endMonth 2021-04-01T03:59:59.999Z

startYear 2021-01-01T04:00:00.000Z
endYear 2022-01-01T03:59:59.999Z

const weekQuery = {
    "clientUserData.review.npsUpdatedAt": weeklyQuery,
};
 */
