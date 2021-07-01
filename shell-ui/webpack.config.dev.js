const path = require('path');
const { version } = require('./package.json');
const { DefinePlugin } = require('webpack');
const common = require('./webpack.common');

const controlPlaneIP = '{{IP}}';
const controlPlaneBaseUrl = `https://${controlPlaneIP}:8443`;

module.exports = (env) => ({
  ...common,
  mode: 'development',
  devtool: 'source-map',
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
    historyApiFallback: {
      rewrites: [
        { from: /^\/.*$/, to: '/shell/index.html' },
      ]
    },
    contentBase: 'public',
    proxy: [
      {
        context: ['/static/js'],
        target: 'http://localhost:3000',
        secure: false,
      },
      {
        context: ['/api', '/grafana', '/docs', '/oidc'],
        target: controlPlaneBaseUrl,
        secure: false,
      },
    ]
  },
  plugins: [
    ...common.plugins(),
    new DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify('development'),
      },
    })
  ],
});
