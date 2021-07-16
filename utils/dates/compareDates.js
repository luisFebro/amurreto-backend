// tags: areDatesEqual
// LESSON: Equality operators (== and ===) don't work with Date objects, so we don't explicitly check if they're the same.
// exception is getTime() which can be compared since it uses a number of milliseconds elapsed since the Unix epoch - A Number, representing the number of milliseconds since midnight January 1, 1970
// https://stackabuse.com/compare-two-dates-in-javascript/#:~:text=Comparing%20Two%20Dates%20in%20JavaScript&text=Note%3A%20Equality%20operators%20(%20%3D%3D%20and,elapsed%20since%20the%20Unix%20epoch.
function compareDates(d1, d2, mode = "isEqual") {
    if (!d1 || !d2) return false;
    const allowedModes = ["isEqual", "is1Greater2", "is1Lesser2"];

    if (!allowedModes) throw new Error(`mode is invalid. Only ${allowedModes}`);

    const date1 = new Date(d1);
    const date2 = new Date(d2);

    if (mode === "isEqual")
        return date1.getTime() === date2.getTime() ? true : false;
    if (mode === "is1Greater2") return date1 > date2 ? true : false;
    if (mode === "is1Lesser2") return date1 < date2 ? true : false;
}

module.exports = compareDates;

/*
console.log(compareDates("2021-04-14T21:41:45.674Z", "2021-04-14T21:38:14.146Z", "is1Greater2"))
console.log(new Date("2021-04-14T21:41:45.674Z").getTime());
console.log(new Date().getTime());
 */
