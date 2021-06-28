const path = require('path');
const { version } = require('./package.json');
const { DefinePlugin } = require('webpack');
const common = require('./webpack.common');

module.exports = {
  ...common,
  mode: 'production',
  devtool: false,
  entry: {
    shell: './src/index.js',
  },
  output: {
    path: path.resolve(__dirname, 'build'),
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
