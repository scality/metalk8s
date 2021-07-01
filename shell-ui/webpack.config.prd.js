const { version } = require('./package.json');
const { DefinePlugin } = require('webpack');
const common = require('./webpack.common');

module.exports = {
  ...common,
  mode: 'production',
  devtool: false,
  plugins: [
    ...common.plugins(),
    new DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify('production'),
      },
    }),
  ],
};
