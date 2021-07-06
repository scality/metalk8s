const { version } = require('./package.json');
const { DefinePlugin } = require('webpack');
const common = require('./webpack.common');
const path = require('path');
const fs = require('fs-extra');

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
    {
      apply: compiler => {
        compiler.hooks.afterEmit.tap('AfterEmitPlugin', compilation => {
          fs.copySync(
            path.resolve(__dirname, 'public/shell'),
            path.resolve(__dirname, 'build'),
            {
              dereference: true,
            },
          );
        });
      },
    },
  ],
};
