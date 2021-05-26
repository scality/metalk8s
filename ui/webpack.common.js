const path = require('path');
const HtmlWebPackPlugin = require('html-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const ESLintPlugin = require('eslint-webpack-plugin');
const { DefinePlugin } = require('webpack');
const ModuleFederationPlugin = require("webpack/lib/container/ModuleFederationPlugin");
const deps = require("./package.json").dependencies;

module.exports = (env) => ({
  entry: {
    metalk8s_ui: './src/index.js',
  },
  output: {
    filename: 'static/js/[name].js',
    path: path.resolve(__dirname, 'build'),
    publicPath: '/',
  },
  resolve: {
    modules: ['node_modules'],
    extensions: ['.js', '.jsx', '.css', '.json'],
    alias: {
      _: [path.resolve(__dirname, 'public')],
      'vega-lite': 'vega-lite/build/vega-lite.min.js'
    },
  },
  /*
   * https://webpack.js.org/configuration/performance/#performancehints
   */
  performance: {
    hints: 'error',
    // ~732 KiB for production
    // ~4.06 MiB for development because flow increase the size of assets.
    maxAssetSize: process.env.NODE_ENV === 'production' ? 750000 : 5000000,
    assetFilter: (assetFilename) => {
      return (
        !assetFilename.endsWith('.map.gz') && assetFilename.endsWith('.gz')
      );
    },
  },
  module: {
    rules: 
    [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
      {
        test: /\.html$/,
        use: [
          {
            loader: 'html-loader',
          },
        ],
      },
      {
        test: /\.(jpe?g|gif|png|ttf|eot|svg)$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[name].[ext]?[hash]',
              outputPath: 'static/media/',
            },
          },
        ],
      },
      {
        test: /\.woff(2)?$/,
        use: [
          {
            loader: 'url-loader',
            options: {
              limit: 10000,
              mimetype: 'application/fontwoff',
              outputPath: 'static/media/',
            },
          },
        ],
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /oidc-client/,
        use: 'null-loader',
      },
    ],
  },
  plugins: [
    new ModuleFederationPlugin({
      name: "metalk8s",
      filename: "remoteEntry.js",
      exposes: {
        "./FederableApp": "./src/FederableApp",
      },
      shared: {
        ...deps,
        react: {
          singleton: true,
          requiredVersion: deps.react,
        },
        "react-dom": {
          singleton: true,
          requiredVersion: deps["react-dom"],
        },
      },
    }),
    new ESLintPlugin(),
    new CompressionPlugin(),
    new DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify(env),
        PUBLIC_URL: JSON.stringify('/'),
      },
    }),
    new HtmlWebPackPlugin({
      template: '!!handlebars-loader!./src/index.html',
      filename: './index.html',
    }),
  ],
});
