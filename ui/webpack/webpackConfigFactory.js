const webpackMerge = require('webpack-merge');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');
const WriteFilePlugin = require('write-file-webpack-plugin');
const webpack = require('webpack');
const common = require('../webpack/webpack.common');
const paths = require('../webpack/paths');
const URLImportPlugin = require('webpack-external-import/webpack');

const envs = {
  development: 'dev',
  production: 'prod',
  test: 'dev',
};
/* eslint-disable global-require,import/no-dynamic-require */
const env = envs[process.env.NODE_ENV || 'development'];
const envConfig = require(`../webpack/webpack.${env}.js`);
//const SpeedMeasurePlugin = require('speed-measure-webpack-plugin');

module.exports = (port, options) => {
  const commonPaths = paths(port);
  const manifestName = `metalk8s`;
  const templatePath = path.resolve(__dirname, `../public/index.html`);

  return webpackMerge(
    common(commonPaths),
    envConfig(commonPaths),
    {
      plugins: [
        new WriteFilePlugin(),
        new URLImportPlugin({
          manifestName,
          fileName: 'importManifest.js',
          basePath: ``,
          publicPath: `//localhost:${commonPaths.port}/`,
          transformExtensions: /^(gz|map)$/i,
          writeToFileEmit: false,
          seed: null,
          filter: null,
          debug: true,
          map: null,
          generate: null,
          sort: null,
        }),
        new HtmlWebpackPlugin({
          template: templatePath,
          inject: true,
        }),
      ],
    },
    options,
  );
};
