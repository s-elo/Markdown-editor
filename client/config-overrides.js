const path = require("path");
const { override, addWebpackAlias } = require("customize-cra");
const addLessLoader = require("customize-cra-less-loader");

module.exports = override(
  addLessLoader(),
  addWebpackAlias({
    ["@"]: path.resolve(__dirname, "./src"),
  })
);
