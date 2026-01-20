import path from 'path';
import fs from 'fs';
import packageJson from './package.json';
import type { Configuration } from '@rspack/cli';
import * as rspack from '@rspack/core';
import { ModuleFederationPlugin } from '@module-federation/enhanced/rspack';
import { RsdoctorRspackPlugin } from '@rsdoctor/rspack-plugin';

const deps = packageJson.dependencies;

const controlPlaneIP = '{{IP}}';
const controlPlaneBaseUrl = `https://${controlPlaneIP}:8443`;

const isProduction = process.env.NODE_ENV === 'production';

let proxy = [
  {
    context: ['/static/js', '/.well-known'],
    target: 'http://localhost:3000',
    secure: false,
  },
  {
    context: [
      '/auth',
      '/api/kubernetes',
      '/api/salt',
      '/api/prometheus',
      '/api/alertmanager',
      '/api/loki',
      '/grafana',
      '/docs',
    ],
    target: controlPlaneBaseUrl,
    secure: false,
  },
];

if (fs.existsSync(path.join(__dirname, 'dev.proxy.json'))) {
  proxy = JSON.parse(fs.readFileSync(path.join(__dirname, 'dev.proxy.json'), 'utf8'));
}

const config: Configuration = {
  experiments: {
    css: true,
  },
  entry: './src/index.tsx',
  mode: isProduction ? 'production' : 'development',
  devtool: isProduction ? false : 'source-map',
  output: {
    filename: 'static/js/[name].[contenthash].js',
    assetModuleFilename: 'static/assets/[name].[hash][ext][query]',
    cssFilename: 'static/css/[name].[contenthash].css',
    path: path.resolve(__dirname, 'build'),
    publicPath: '/shell/',
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
  resolve: {
    modules: ['node_modules'],
    extensions: ['.js', '.jsx', '.css', '.json', '.ts', '.tsx'],
  },
  plugins: [
    new ModuleFederationPlugin({
      name: 'shell',
      filename: `remoteEntry.js`,
      exposes: {
        './App': './src/FederatedApp.tsx',
        './lang': './src/navbar/lang.tsx',
        './auth/AuthProvider': './src/auth/AuthProvider.tsx',
        './alerts/AlertProvider': './src/alerts/AlertProvider.tsx',
        './alerts/alertHooks': './src/alerts/alertHooks.ts',
        './navbar/navbarHooks': './src/navbar/navbarHooks.ts',
        './moduleFederation/ConfigurationProvider': './src/initFederation/ConfigurationProviders.tsx',
        './moduleFederation/ShellConfigurationProvider': './src/initFederation/ShellConfigProvider.tsx',
        './moduleFederation/UIListProvider': './src/initFederation/UIListProvider.tsx',
        './useNotificationCenter': './src/useNotificationCenter.ts',
      },
      shared: {
        ...Object.fromEntries(Object.entries(deps).map(([key, version]) => [key, {}])),
        '@scality/core-ui': {
          singleton: true,
        },
        'react-intl': {
          eager: true,
          singleton: true,
        },
        '@scality/module-federation': {
          singleton: true,
          eager: true,
        },
        react: {
          singleton: true,
          eager: true,
          requiredVersion: deps.react,
        },
        'styled-components': {
          singleton: true,
          eager: true,
          requiredVersion: deps['styled-components'],
        },
        'react-dom': {
          singleton: true,
          eager: true,
          requiredVersion: deps['react-dom'],
        },
        'react-query': {
          singleton: true,
          eager: true,
        },
        'react-router': {
          singleton: true,
          eager: true,
        },
        'react-router-dom': {
          singleton: true,
          eager: true,
        },
        'oidc-client-ts': {
          singleton: true,
          eager: true,
        },
        'oidc-react': {
          singleton: true,
          eager: true,
        },
        'react-error-boundary': {
          singleton: true,
          eager: true,
        },
        downshift: {
          singleton: true,
          eager: true,
        },
        zod: {
          singleton: true,
          eager: true,
        },
      },
    }),
    new rspack.HtmlRspackPlugin({
      templateParameters: {
        version: new Date().getTime().toString(),
      },
      template: './index-template.html',
      filename: './index.html',
      excludedChunks: ['shell'],
    }),
    new rspack.CopyRspackPlugin({
      patterns: [{ from: 'public' }],
    }),
    process.env.RSDOCTOR && new RsdoctorRspackPlugin({}),
  ].filter(Boolean),
  devServer: {
    port: 8084,
    historyApiFallback: {
      rewrites: [{ from: /./, to: '/shell/index.html' }],
    },
    hot: !isProduction,
    client: {
      overlay: {
        warnings: false,
        errors: true,
      },
    },
    static: path.join(__dirname, 'public'),
    proxy: proxy,
    setupMiddlewares: (middlewares, devServer) => {
      devServer.app.get('/shell/config.json', (req, res) => {
        const devConfigPath = path.join(__dirname, 'public/dev.config.json');
        const defaultConfigPath = path.join(__dirname, 'public/config.json');
        const configPath = fs.existsSync(devConfigPath) ? devConfigPath : defaultConfigPath;
        res.sendFile(configPath);
      });

      devServer.app.get('/shell/deployed-ui-apps.json', (req, res) => {
        const devConfigPath = path.join(__dirname, 'public/dev.deployed-ui-apps.json');
        const defaultConfigPath = path.join(__dirname, 'public/deployed-ui-apps.json');
        const configPath = fs.existsSync(devConfigPath) ? devConfigPath : defaultConfigPath;
        res.sendFile(configPath);
      });
      return middlewares;
    },
  },
};

export = config;
