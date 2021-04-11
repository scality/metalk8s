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
//   externals: [({ context, request }, callback) => {
//     // Do not bundle react nor react-query within alerts library (they should be imported as peer dependencies)
//     if (/\/alerts/.test(context) && /^react/.test(request)) {
//       return callback(null, 'commonjs ' + request)
//     }

//     // Continue without externalizing the import
//     callback();
//   },
// ],
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
