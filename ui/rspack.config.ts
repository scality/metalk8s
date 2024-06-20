import { Configuration } from '@rspack/cli';
import rspack from '@rspack/core';
const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin');
const path = require('path');
const deps = require('./package.json').dependencies;

const config: Configuration = {
  entry: {
    metalk8s_ui: './src/index.ts',
  },
  output: {
    filename: 'static/js/[name].[contenthash].js',
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
    fallback: { querystring: require.resolve('querystring-es3') },
  },
  module: {
    rules: [
      {
        test: /\.jsx$/,
        use: {
          loader: 'builtin:swc-loader',
          options: {
            jsc: {
              parser: {
                syntax: 'ecmascript',
                jsx: true,
              },
            },
          },
        },
        type: 'javascript/auto',
      },
      {
        test: /\.ts$/,
        exclude: [/node_modules/],
        loader: 'builtin:swc-loader',
        options: {
          jsc: {
            parser: {
              syntax: 'typescript',
            },
          },
        },
        type: 'javascript/auto',
      },
      {
        test: /\.tsx$/,
        use: {
          loader: 'builtin:swc-loader',
          options: {
            jsc: {
              parser: {
                syntax: 'typescript',
                tsx: true,
              },
            },
          },
        },
        type: 'javascript/auto',
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
    ],
  },
  // performance: {
  //   hints: 'warning',
  //   // ~1.2 MiB for production
  //   maxAssetSize: process.env.NODE_ENV === 'production' ? 1_300_000 : Infinity,
  //   assetFilter: (assetFilename) => {
  //     return (
  //       !assetFilename.endsWith('.map.gz') && assetFilename.endsWith('.gz')
  //     );
  //   },
  // },
  plugins: [
    //   new ModuleFederationPlugin({
    //     name: 'shell',
    //     filename: `remoteEntry.js`,
    //     exposes: {
    //       './App': './src/FederatedApp.tsx',
    //       './lang': './src/navbar/lang.tsx',
    //       './auth/AuthProvider': './src/auth/AuthProvider.tsx',
    //       './alerts/AlertProvider': './src/alerts/AlertProvider.tsx',
    //       './alerts/alertHooks': './src/alerts/alertHooks.ts',
    //       './navbar/navbarHooks': './src/navbar/navbarHooks.ts',
    //       './moduleFederation/ConfigurationProvider':
    //         './src/initFederation/ConfigurationProviders.tsx',
    //       './moduleFederation/ShellConfigurationProvider':
    //         './src/initFederation/ShellConfigProvider.tsx',
    //       './moduleFederation/UIListProvider':
    //         './src/initFederation/UIListProvider.tsx',
    //       './useNotificationCenter': './src/useNotificationCenter.ts',
    //     },
    //     shared: {
    //       ...Object.fromEntries(
    //         Object.entries(deps).map(([key, version]) => [key, {}]),
    //       ),
    //       '@fortawesome/react-fontawesome': {
    //         eager: true,
    //         singleton: true,
    //       },
    //       '@fortawesome/fontawesome-svg-core': {
    //         eager: true,
    //         singleton: true,
    //       },
    //       '@scality/core-ui': {
    //         singleton: true,
    //       },
    //       'react-intl': {
    //         eager: true,
    //         singleton: true,
    //       },
    //       '@scality/module-federation': {
    //         singleton: true,
    //         eager: true,
    //       },
    //       react: {
    //         singleton: true,
    //         eager: true,
    //         requiredVersion: deps.react,
    //       },
    //       'styled-components': {
    //         singleton: true,
    //         eager: true,
    //         requiredVersion: deps['styled-components'],
    //       },
    //       'styled-system': {
    //         singleton: true,
    //         eager: true,
    //         requiredVersion: deps['styled-system'],
    //       },
    //       'react-dom': {
    //         singleton: true,
    //         eager: true,
    //         requiredVersion: deps['react-dom'],
    //       },
    //       'react-query': {
    //         singleton: true,
    //         eager: true,
    //       },
    //       'react-router': {
    //         singleton: true,
    //         eager: true,
    //       },
    //       'react-router-dom': {
    //         singleton: true,
    //         eager: true,
    //       },
    //       polished: {
    //         singleton: true,
    //         eager: true,
    //       },
    //       'oidc-client': {
    //         singleton: true,
    //         eager: true,
    //       },
    //       'oidc-react': {
    //         singleton: true,
    //         eager: true,
    //       },
    //       'react-error-boundary': {
    //         singleton: true,
    //         eager: true,
    //       },
    //       '@js-temporal/polyfill': {
    //         singleton: true,
    //         eager: true,
    //       },
    //       downshift: {
    //         singleton: true,
    //         eager: true,
    //       },
    //     },
    //   }),
    new rspack.DefinePlugin({
      NODE_ENV: JSON.stringify('production'), // FIXME should be an env variable
      PUBLIC_URL: JSON.stringify('/'),
    }),
  ],
};

export = config;
