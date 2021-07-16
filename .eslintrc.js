// uninstalled airbnb code style since it requires jsx-a11x to work which is a frontend plugin. It does not make sence in the backend.

module.exports = {
    env: {
        node: true,
        commonjs: true,
        es6: true,
    },
    extends: [
        "eslint:recommended",
        "plugin:import/errors",
        "plugin:import/warnings",
        "prettier",
    ],
    plugins: [],
    parser: "babel-eslint",
    parserOptions: {
        ecmaVersion: 8,
        ecmaFeatures: {
            jsx: true,
            modules: true,
        },
    },
    rules: {
        "linebreak-style": "off", // If you aren't concerned about having different line endings within your code, then you can safely turn this rule off.
        quotes: "off", // handled by prettier
        semi: "off", // semicollons are inserted automatically with Prettier.
        indent: "off", // handled by prettier
        "max-len": "off", // max-length by line handled by prettier
        "no-console": "off", // If you're using Node.js, however, console is used to output information to the user and so is not strictly used for debugging purposes. If you are developing for Node.js then you most likely do not want this rule enabled.
        "no-use-before-define": ["error", { functions: false }], // allow functions to be declared after the usage
        "no-underscore-dangle": ["error", { allow: ["_id"] }],
        "no-plusplus": ["error", { allowForLoopAfterthoughts: true }],
        "consistent-return": ["error", { treatUndefinedAsUnspecified: true }],
    },
};
