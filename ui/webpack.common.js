const path = require('path');
const CompressionPlugin = require('compression-webpack-plugin');
const ESLintPlugin = require('eslint-webpack-plugin');
const { DefinePlugin } = require('webpack');
const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin');
const deps = require('./package.json').dependencies;

module.exports = (env) => ({
  entry: {
    metalk8s_ui: './src/index.ts',
  },
  output: {
    filename: 'static/js/[name].js',
    path: path.resolve(__dirname, 'build'),
    publicPath: '/',
  },
  resolve: {
    modules: ['node_modules'],
    extensions: ['.js', '.jsx', '.css', '.json', '.ts', '.tsx'],
    alias: {
      _: [path.resolve(__dirname, 'public')],
      'vega-lite': 'vega-lite/build/vega-lite.min.js',
    },
  },
  /*
   * https://webpack.js.org/configuration/performance/#performancehints
   */
  performance: {
    hints: 'error',
    // ~732 KiB for production
    // ~10.5 MiB for development because flow increase the size of assets.
    maxAssetSize: process.env.NODE_ENV === 'production' ? 750000 : 11000000,
    assetFilter: (assetFilename) => {
      return (
        !assetFilename.endsWith('.map.gz') && assetFilename.endsWith('.gz')
      );
    },
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
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
      name: 'metalk8s',
      filename: 'static/js/remoteEntry.js',
      exposes: {
        './FederableApp': './src/FederableApp.tsx',
        './platformLibrary': './src/services/platformlibrary/k8s.ts',
      },
      shared: {
        ...Object.fromEntries(
          Object.entries(deps).map(([key, version]) => [key, {}]),
        ),
        '@scality/core-ui': {
          singleton: true,
        },
        '@scality/module-federation': {
          singleton: true,
        },
        'styled-components': {
          singleton: true,
          requiredVersion: deps['styled-components'],
        },
        react: {
          singleton: true,
          requiredVersion: deps.react,
        },
        'react-dom': {
          singleton: true,
          requiredVersion: deps['react-dom'],
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
  ],
});
