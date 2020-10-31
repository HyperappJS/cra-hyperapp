#!/usr/bin/env node

const get = prop => value => value[prop];
const flatten = (others, next) => others.concat(next);
const getLoadersFromRules = (rules, path, loaderName) =>
  rules
    .filter(get(path))
    .map(get(path))
    .reduce(flatten, [])
    .filter(get("loader"))
    .filter(({ loader }) => loader.includes(loaderName));

const script = process.argv[2] || "start";
process.env.NODE_ENV = script === "build" ? "production" : "development";

const webpackConfigPath = "react-scripts/config/webpack.config";
const createJestConfigPath = "react-scripts/scripts/utils/createJestConfig";

// load original configs
const webpackConfig = require(webpackConfigPath)(process.env.NODE_ENV);
if (!webpackConfig) {
  throw new Error(`no Webpack config found for: ${webpackConfigPath}`);
}
const { module: { rules = [] } = {} } = webpackConfig;

const babelLoaders = getLoadersFromRules(rules, "oneOf", "babel");
if (!babelLoaders.length) {
  throw new Error(
    `missing Babel config in webpack config: ${webpackConfigPath}`
  );
}
const babelOptions = babelLoaders[0].options;
// configure babel to transpile hyperlit
babelOptions.plugins = (babelOptions.plugins || []).concat("hyperlit");

// override config in cache
require.cache[require.resolve(webpackConfigPath)].exports = () => webpackConfig;

const createJestConfig = require(createJestConfigPath);
require.cache[require.resolve(createJestConfigPath)].exports = (...args) => {
  const jestConfig = createJestConfig(...args);
  for (let key in jestConfig.transform) {
    if (jestConfig.transform[key].includes("fileTransform")) {
      jestConfig.transform[key] = require.resolve("./dummyTransform");
    }
  }
  jestConfig.transformIgnorePatterns = ["node_modules/(?!hyperapp)/"];
  return jestConfig;
};

// call original react script
require(`react-scripts/scripts/${script}.js`);
