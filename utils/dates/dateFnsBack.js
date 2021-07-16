const getMonth = require("date-fns/getMonth");
const addDays = require("date-fns/addDays");
const addHours = require("date-fns/addHours");
const startOfMonth = require("date-fns/startOfMonth");

const monthes = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
];

const lastMonth = addDays(startOfMonth(new Date()), -1);

const getCurrMonth = (date = new Date()) => {
    const indMonth = getMonth(date);
    return monthes[indMonth];
};

module.exports = {
    getCurrMonth,
    addDays,
    addHours,
    lastMonth,
};

// REFERENCE FROM FRONTEND:
// import ptBR from "date-fns/locale/pt-BR";
// import formatDistance from "date-fns/formatDistance";
// import formatRelative from "date-fns/formatRelative";
// import format from "date-fns/format";
// import subDays from "date-fns/subDays";
// import addDays from "date-fns/addDays";
// import getHours from "date-fns/getHours";
// import getMinutes from "date-fns/getMinutes";
// import isToday from "date-fns/isToday";
// import startOfWeek from "date-fns/startOfWeek";
// import endOfWeek from "date-fns/endOfWeek";
// import isAfter from "date-fns/isAfter";
// import { getPureParsedDate } from "./helpers/dateFnsHelpers";
// import getDayMonthBr from "./getDayMonthBr"; // 20 de Junho de 2020 is better than 20º de junho, 2020...

// const localeObj = {
//     default: ptBR,
//     ptBR,
// };

// const dateFnsUtils = DateFnsUtils;
// const ptBRLocale = ptBR;

// const treatZero = (number) => {
//     if (Number(number) <= 9) {
//         return `0${number}`;
//     }
//     return number;
// };

// // tools
// const pick = (locale) => (locale ? localeObj[locale] : localeObj.default);
// const now = new Date();

// const formatDMY = (date, short = false, needYear = true) =>
//     getDayMonthBr(date, { needYear, short });
// const fromNow = (pastDate, locale) =>
//     formatDistance(new Date(pastDate), now, {
//         addSuffix: true,
//         locale: pick(locale),
//         includeSeconds: true,
//     });
// // calendar needs a customformatlike ``{ sameElse: 'll'}`` in moment.
// const calendar = (date, locale) =>
//     formatRelative(new Date(date), now, { locale: pick(locale) });

// const getLocalHour = (date) =>
//     `${getHours(new Date(date))}:${treatZero(getMinutes(new Date(date)))}`;

// // targetDate is inclusive. it will only be expired after the targetDate has passed.
// const isScheduledDate = (targetDate, options = {}) => {
//     const { isDashed = false } = options; // dashed Date = 2020-12-30 format
//     if (!targetDate) return;

//     const today = getPureParsedDate(new Date(), { minHour: true });
//     const scheduled = getPureParsedDate(targetDate, { isDashed });
//     if (today < scheduled) {
//         return true;
//     }

//     return false;
// };

// const checkToday = (date) => isToday(new Date(date));
// const endWeek = endOfWeek(new Date(), { weekStartsOn: 1 });
// const startWeek = startOfWeek(new Date(), { weekStartsOn: 1 });

// const formatSlashDMY = (newDate = new Date()) => format(newDate, "dd/MM/yyyy");

// export {
//     dateFnsUtils,
//     ptBRLocale,
//     formatDMY,
//     formatSlashDMY,
//     fromNow,
//     calendar,
//     addDays,
//     subDays,
//     getLocalHour,
//     checkToday,
//     isScheduledDate,
//     endWeek,
//     startWeek,
//     isAfter, // Is the first date after the second one?
// };
