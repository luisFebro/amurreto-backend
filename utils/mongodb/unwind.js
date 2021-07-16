const unwind = (path) => {
    return { $unwind: { path, preserveNullAndEmptyArrays: true } };
};

module.exports = unwind;

/* COMMENTS
n1:
The following $unwind operation uses the preserveNullAndEmptyArrays option to include documents whose sizes field is null, missing, or an empty array.
*/
