// compare timestamp and if they are HOURLY equal
function compareTimestamp(targetDate, selected) {
    const selectedDate = selected || new Date();
    const utcHour = selectedDate.getUTCHours();

    const now = new Date(selectedDate.setUTCHours(utcHour, 0, 0, 0));

    return JSON.stringify(targetDate) === JSON.stringify(now);
}

module.exports = compareTimestamp;
