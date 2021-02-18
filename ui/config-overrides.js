const {
  useBabelRc,
  override,
  useEslintRc,
  addWebpackPlugin,
} = require('customize-cra');
const webpack = require('webpack')
const CompressionPlugin = require('compression-webpack-plugin');

/**
 * We might want to make that more generic and create a PR to `customize-cra`
 * to handle this use case.
 *
 * https://webpack.js.org/configuration/performance/#performancehints
 */
const setWebpackPerformance = () => (config) => {
  config.performance = {
    hints: 'error',
    // ~732 KiB for production
    // ~1953 KiB for development because flow increase the size of assets.
    maxAssetSize: process.env.NODE_ENV === 'production' ? 750000 : 2000000,
    assetFilter: (assetFilename) => {
      return (
        !assetFilename.endsWith('.map.gz') && assetFilename.endsWith('.gz')
      );
    },
  };
  return config;
};

const setNullModuleForOidcClient = () => (config) => {
  config.module = {
    ...config.module,
    rules: [
      ...config.module.rules,
      {
        test: /oidc-client/,
        use: 'null-loader',
      },
    ],
  }

  return config;
}

module.exports = override(
  useBabelRc(),
  useEslintRc(),
  setNullModuleForOidcClient(),// We only use oidc-client for type definitions
  addWebpackPlugin(new CompressionPlugin()),
  setWebpackPerformance(),
);
