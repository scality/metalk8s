import path from 'path';
import packageJson from './package.json';
import { Configuration } from '@rspack/cli';
import rspack from '@rspack/core';
import { ModuleFederationPlugin } from '@module-federation/enhanced/rspack';
import fs from 'fs';

const deps = packageJson.dependencies;

const isProduction = process.env.NODE_ENV === 'production';

let version = process.env.VERSION;
if (!version) {
  const versionFileContents = fs.readFileSync(
    path.join(__dirname, '../VERSION'),
    { encoding: 'utf-8' },
  );
  const versionRegex =
    /.*VERSION_MAJOR=(?<versionMajor>\d+)(\n){0,1}.*VERSION_MINOR=(?<versionMinor>\d+)(\n){0,1}.*VERSION_PATCH=(?<versionPatch>\d+)(\n){0,1}.*VERSION_SUFFIX=(?<versionSuffix>.*)/m;
  const { versionMajor, versionMinor, versionPatch, versionSuffix } =
    versionRegex.exec(versionFileContents).groups;
  version = `${versionMajor}.${versionMinor}.${versionPatch}${versionSuffix}`;
}

const config: Configuration = {
  entry: {
    metalk8s_ui: './src/index.ts',
  },
  mode: isProduction ? 'production' : 'development',
  devtool: isProduction ? false : 'source-map',
  output: {
    filename: 'static/js/[name].[contenthash].js',
    assetModuleFilename: 'static/assets/[name].[hash][ext][query]',
    cssFilename: 'static/css/[name].[contenthash].css',
    path: path.resolve(__dirname, 'build'),
    publicPath: '/metalk8s/',
  },
  resolve: {
    modules: ['node_modules'],
    extensions: ['.js', '.jsx', '.css', '.json', '.ts', '.tsx'],
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
        test: /\.(jpe?g|gif|png|ttf|eot|svg)$/,
        type: 'asset',
      },
      {
        test: /\.woff(2)?$/,
        type: 'asset/resource',
      },
      {
        test: /\.css$/,
        type: 'css',
      },
    ],
  },
  plugins: [
    new ModuleFederationPlugin({
      name: 'metalk8s',
      filename: `static/js/remoteEntry.${version}.js`,
      exposes: {
        './FederableApp': './src/FederableApp.tsx',
        './platformLibrary': './src/services/platformlibrary/k8s.ts',
        './AlertsNavbarUpdater':
          './src/components/AlertNavbarUpdaterComponent.tsx',
        './Metalk8sLocalVolumeProvider':
          './src/services/k8s/Metalk8sLocalVolumeProvider.ts',
      },
      remotes: !isProduction
        ? {
            shell: 'shell@http://localhost:8084/shell/mf-manifest.json',
          }
        : undefined,
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
    new rspack.CopyRspackPlugin({
      patterns: [
        { from: 'public' },
        {
          from: path.resolve(__dirname, 'build/static/js/@mf-types.zip'),
          to: '@mf-types.zip',
          noErrorOnMissing: true,
        },
        {
          from: path.resolve(__dirname, 'build/static/js/@mf-types.d.ts'),
          to: '@mf-types.d.ts',
          noErrorOnMissing: true,
        },
      ],
    }),
    new rspack.DefinePlugin({
      NODE_ENV: process.env.NODE_ENV,
      PUBLIC_URL: JSON.stringify('/'),
    }),
  ],
  devServer: {
    port: 3000,
    hot: !isProduction,
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
