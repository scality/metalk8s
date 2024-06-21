import { Configuration } from '@rspack/cli';
import rspack from '@rspack/core';
import { ModuleFederationPlugin } from '@module-federation/enhanced/rspack';
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
              transform: {
                react: {
                  runtime: 'automatic',
                },
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
              transform: {
                react: {
                  runtime: 'automatic',
                },
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
    new ModuleFederationPlugin({
      name: 'metalk8s',
      filename: 'static/js/remoteEntry.js',
      exposes: {
        './FederableApp': './src/FederableApp.tsx',
        './platformLibrary': './src/services/platformlibrary/k8s.ts',
        './AlertsNavbarUpdater':
          './src/components/AlertNavbarUpdaterComponent.tsx',
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
    new rspack.DefinePlugin({
      NODE_ENV: JSON.stringify('production'), // FIXME should be an env variable
      PUBLIC_URL: JSON.stringify('/'),
    }),
  ],
  devServer: {
    port: 3000,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers':
        'X-Requested-With, content-type, Authorization',
    },
    static: path.join(__dirname, 'public'),
    client: {
      overlay: {
        warnings: false,
        errors: true,
      },
    },
  },
};

export = config;
