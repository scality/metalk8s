/* eslint-env node */
const webpack = require('webpack');
const path = require('path');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: path.resolve(__dirname, 'src/index.js'),
  output: {
    filename: 'metalK8s.js',
    library: 'metalK8s',
    libraryTarget: 'amd',
    path: path.resolve(__dirname, 'dist/metalK8s'),
  },
  mode: 'production',
  module: {
    rules: [
      { parser: { System: false } },
      {
        test: /\.js?$/,
        exclude: [path.resolve(__dirname, 'node_modules')],
        loader: 'babel-loader',
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              modules: true,
              localIdentName: '[path][name]__[local]',
            },
          },
          {
            loader: 'postcss-loader',
            options: {
              plugins() {
                return [require('autoprefixer')];
              },
            },
          },
        ],
      },
      {
        test: /\.(ttf|woff|woff2|eot|svg)$/,
        use: {
          loader: 'url-loader',
        },
      },
    ],
  },
  resolve: {
    modules: [__dirname, 'node_modules'],
  },
  plugins: [
    new CleanWebpackPlugin(['dist/metalK8s']),
    CopyWebpackPlugin([{ from: path.resolve(__dirname, 'src/index.js') }]),
  ],
  devtool: 'source-map',
  externals: [/^react$/, /^react\/lib.*/, /^react-dom$/, /.*react-dom.*/],
};
