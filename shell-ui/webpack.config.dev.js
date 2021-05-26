const HtmlWebPackPlugin = require('html-webpack-plugin');
const path = require('path');
const { version } = require('./package.json');
const { DefinePlugin } = require('webpack');
const common = require('./webpack.common');

module.exports = () => ({
  ...common,
  mode: 'development',
  devtool: 'source-map',
  entry:
    env.entry === 'navbar'
      ? { 'solution-ui-navbar': './index.navbar.js' }
      : { alerts: './index.alerts.js' },
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: `shell/[name].${version}.js`,
  },
  module: {
    ...common.module,
    rules: [
      ...common.module.rules,
      {
        test: /\.mdx?$/,
        use: ['babel-loader', '@mdx-js/loader'],
      },
    ],
  },
  devServer: {
    port: process.env.PORT || 8082,
    historyApiFallback: true,
    contentBase: 'public',
  },
  plugins: [
    ...common.plugins,
    new DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify('development'),
      },
    }),
    new HtmlWebPackPlugin({
      template: './index-template.html',
    }),
  ],
});
