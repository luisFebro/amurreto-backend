function regexSearchQuery(defaultSearch = {}, options = {}) {
    const { customField, field = "name", search } = options;

    const regex = { $regex: `${search}`, $options: "i" };

    if (search && customField) return { ...defaultSearch, ...customField };
    if (search) return { ...defaultSearch, [field]: regex };

    return defaultSearch;
}

module.exports = { regexSearchQuery };
