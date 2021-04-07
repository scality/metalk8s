const HtmlWebPackPlugin = require('html-webpack-plugin');
const path = require('path');
const { version } = require('./package.json');
const { DefinePlugin } = require('webpack');
module.exports = {
  mode: 'development',
  devtool: 'source-map',
  entry: {
    'solution-ui-navbar': './index.navbar.js',
    alerts: './index.alerts.js',
  },
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: `shell/[name].${version}.js`,
  },
  module: {
    // ...
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
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
    new DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify('development'),
      },
    }),
    new HtmlWebPackPlugin({
      template: './index-template.html',
    }),
  ],
};
