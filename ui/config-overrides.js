const {
  useBabelRc,
  override,
  useEslintRc,
  addWebpackPlugin
} = require('customize-cra');
const CompressionPlugin = require('compression-webpack-plugin');

module.exports = override(
  useBabelRc(),
  useEslintRc(),
  addWebpackPlugin(new CompressionPlugin())
);
