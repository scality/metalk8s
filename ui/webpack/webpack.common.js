const webpack = require('webpack');
const path = require('path');

module.exports = commonPaths => ({
  module: {
    rules: [
      // {
      //   enforce: 'pre',
      //   test: /\.(js|jsx)$/,
      //   loader: 'eslint-loader',
      //   exclude: /(node_modules)/,
      //   options: {
      //     emitWarning: process.env.NODE_ENV !== 'production',
      //   },
      // },
      {
        test: /\.(js|jsx)$/,
        loader: 'babel-loader',
        exclude: /(node_modules)/,
        options: {
          babelrcRoots: ['.', __dirname],
        },
      },
      {
        test: /\.(css|scss)$/,
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
        test: /\.(png|jpg|gif|svg)$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              outputPath: commonPaths.imagesFolder,
            },
          },
        ],
      },
      {
        test: /\.(woff2|ttf|woff|eot)$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              outputPath: commonPaths.fontsFolder,
            },
          },
        ],
      },
    ],
  },
  serve: {
    content: commonPaths.entry,
    dev: {
      publicPath: commonPaths.outputPath,
    },
  },
  resolve: {
    modules: [path.resolve(__dirname, 'src'), 'node_modules'],
    /*extensions: ['*', '.js', '.jsx', '.css', '.scss'],
      alias: {
      react: path.resolve("../../node_modules/react")
    } */
  },
  plugins: [],
});
