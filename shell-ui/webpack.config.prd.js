const path = require('path');
const { version } = require('./package.json');
const { DefinePlugin } = require('webpack');
const common = require('./webpack.common');

module.exports = {
  ...common,
  mode: 'production',
  devtool: false,
  entry: {
    'solution-ui-navbar': './src/navbar/index.js',
    alerts: './src/alerts/index.js',
    platform: './src/platform/library.js',
  },
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: `[name].${version}.js`,
  },
  plugins: [
    ...common.plugins(),
    new DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify('production'),
      },
    }),
  ],
};
