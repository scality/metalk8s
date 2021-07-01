const common = require('./webpack.common.js');
const path = require('path');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer')
  .BundleAnalyzerPlugin;
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const webpack = require('webpack');
const HtmlWebPackPlugin = require('html-webpack-plugin');

const env = 'development';
const controlPlaneIP = '{{IP}}';
const controlPlaneBaseUrl = `https://${controlPlaneIP}:8443`;

module.exports = {
  ...common(env),
  mode: env,
  devtool: 'inline-source-map',
  plugins: [
    ...common(env).plugins,
    new HtmlWebPackPlugin({
      template: '!!handlebars-loader!./src/index.html',
      filename: './index.html',
    }),
    new BundleAnalyzerPlugin(),
    new webpack.HotModuleReplacementPlugin(),
    new ReactRefreshWebpackPlugin({
      overlay: {
        sockProtocol: 'wss',
      },
    }),
  ],
  devServer: {
    static: path.join(__dirname, 'public'),
    host: 'localhost',
    port: 3000,
    open: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "X-Requested-With, content-type, Authorization"
    },  
    historyApiFallback: true,
    hot: true,
    client: {
      overlay: {
        warnings: false,
        errors: true,
      },
    },
    proxy: [
      {
        context: ['/shell'],
        target: 'http://localhost:8084/shell',
        pathRewrite: { '^/shell': '' },
        secure: false,
      },
      {
        context: ['/api', '/grafana', '/docs', '/oidc'],
        target: controlPlaneBaseUrl,
        secure: false,
      },
    ],
  },
};
