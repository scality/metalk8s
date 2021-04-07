const path = require('path');
const { version } = require('./package.json');
const { DefinePlugin } = require('webpack');
module.exports = {
  mode: 'production',
  devtool: false,
  entry: {
    'solution-ui-navbar': './src/navbar/index.js',
    alerts: './src/alerts/index.js',
  },
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: `[name].${version}.js`,
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
    ],
  },
  plugins: [
    new DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify('production'),
      },
    }),
  ],
};
