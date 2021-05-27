const common = require('./webpack.common');
const CompressionPlugin = require('compression-webpack-plugin');
const path = require('path');
const fs = require('fs-extra');

const env = 'production';

module.exports = {
  ...common(env),
  mode: env,
  devtool: 'hidden-source-map',
  plugins: [
    ...common(env).plugins,
    new CompressionPlugin(),
    {
      apply: compiler => {
        compiler.hooks.afterEmit.tap('AfterEmitPlugin', compilation => {
          fs.copySync(
            path.resolve(__dirname, 'public'),
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
