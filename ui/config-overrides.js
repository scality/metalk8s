const {
  useBabelRc,
  override,
  useEslintRc,
  addWebpackPlugin,
} = require('customize-cra');
const CompressionPlugin = require('compression-webpack-plugin');

/**
 * We might want to make that more generic and create a PR to `customize-cra`
 * to handle this use case.
 *
 * https://webpack.js.org/configuration/performance/#performancehints
 */
const setWebpackPerformance = () => config => {
  config.performance = {
    hints: 'error',
    // ~390 KiB for production
    // ~1953 KiB for development because flow increase the size of assets.
    maxAssetSize: process.env.NODE_ENV === 'production' ? 400000 : 2000000,
    assetFilter: assetFilename => {
      return (
        !assetFilename.endsWith('.map.gz') && assetFilename.endsWith('.gz')
      );
    },
  };
  return config;
};

module.exports = override(
  useBabelRc(),
  useEslintRc(),
  addWebpackPlugin(new CompressionPlugin()),
  setWebpackPerformance(),
);
