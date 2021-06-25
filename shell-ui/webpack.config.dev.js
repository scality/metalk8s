const path = require('path');
const { version } = require('./package.json');
const { DefinePlugin } = require('webpack');
const common = require('./webpack.common');

module.exports = (env) => ({
  ...common,
  mode: 'development',
  devtool: 'source-map',
  entry:
    env.entry === 'navbar'
      ? { 'solution-ui-navbar': './index.navbar.js' }
      : env.entry === 'all'
      ? {
          'solution-ui-navbar': './src/navbar/index.js',
          alerts: './src/alerts/index.js',
          platform: './src/platform/library.js',
          index: './index.all.js',
        }
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
    port: process.env.PORT || 8084,
    historyApiFallback: true,
    contentBase: 'public',
  },
  plugins: [
    ...common.plugins('shell/'),
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
