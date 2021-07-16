exports.countQuery = { $count: "total" };
exports.sumQuery = (field) => ({
    // field like $value.db
    $group: {
        _id: null,
        value: { $sum: field },
    },
});
// Count occurrences of duplicate values
//reference: https://stackoverflow.com/questions/34644655/count-occurrences-of-duplicate-values
exports.occurrenceQuery = (fieldId, options = {}) => {
    const { fieldSum, needCount = true } = options;

    // in case you want to count the total and amount at the same time
    const countQuery = needCount ? { times: { $sum: 1 } } : undefined;

    const amountQuery = fieldSum ? { amount: { $sum: fieldSum } } : undefined;

    return {
        $group: {
            _id: fieldId,
            ...countQuery,
            ...amountQuery,
        },
    };
};
