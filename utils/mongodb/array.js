const nonEmptyArrayQuery = { $exists: true, $ne: [] };

module.exports = {
    nonEmptyArrayQuery,
};
