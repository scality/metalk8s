import path from 'path';
import packageJson from './package.json';
import type { Configuration } from '@rspack/cli';
import * as rspack from '@rspack/core';
import type { Compiler } from '@rspack/core';
import { ModuleFederationPlugin } from '@module-federation/enhanced/rspack';
import fs from 'fs';

interface MicroAppRuntimeConfiguration {
  kind: string;
  apiVersion: string;
  metadata: Record<string, unknown>;
  spec: Record<string, unknown>;
}

class MicroAppRuntimeConfigurationPlugin {
  private config: MicroAppRuntimeConfiguration;
  private prefix: string;
  private headers: Record<string, string>;
  private debug: boolean;

  constructor(defaultConfig: MicroAppRuntimeConfiguration, prefix = 'MICRO_APP_RUNTIME_', headers = {}, debug = false) {
    this.prefix = prefix;
    this.headers = headers;
    this.debug = debug;
    this.config = this.applyEnvOverrides(defaultConfig);
  }

  private applyEnvOverrides(config: MicroAppRuntimeConfiguration): MicroAppRuntimeConfiguration {
    const result = JSON.parse(JSON.stringify(config)) as MicroAppRuntimeConfiguration;

    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith(this.prefix) && value !== undefined) {
        // Use "__" as path separator (e.g., "selfConfiguration__url_salt" → ["selfConfiguration", "url_salt"])
        const specPath = key.slice(this.prefix.length).split('__');
        const currentValue = this.getNestedValue(result.spec, specPath);
        this.setNestedValue(result.spec, specPath, this.parseValue(value, currentValue));
      }
    }

    if (this.debug) {
      console.log('config', result);
    }
    return result;
  }

  private getNestedValue(obj: Record<string, unknown>, keys: string[]): unknown {
    let current: unknown = obj;

    for (const key of keys) {
      if (current === null || typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[key];
    }

    return current;
  }

  private setNestedValue(obj: Record<string, unknown>, keys: string[], value: unknown): void {
    let current: Record<string, unknown> = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
        current[key] = {};
      }
      current = current[key] as Record<string, unknown>;
    }

    current[keys[keys.length - 1]] = value;
  }

  private parseValue(value: string, currentValue?: unknown): unknown {
    // Try parsing as JSON first (handles arrays, objects, booleans, numbers)
    try {
      return JSON.parse(value);
    } catch {
      // If the current value is an array, treat comma-separated values as array
      if (Array.isArray(currentValue) && value.includes(',')) {
        return value.split(',').map((v) => v.trim());
      }
      // Return as string if not valid JSON
      return value;
    }
  }

  apply(compiler: Compiler): void {
    const publicPath = compiler.options.output?.publicPath ?? '/';
    const normalizedPublicPath = typeof publicPath === 'string' ? publicPath.replace(/\/$/, '') : '';

    // Extend devServer configuration
    const originalSetupMiddlewares = compiler.options.devServer?.setupMiddlewares;

    if (compiler.options.devServer) {
      compiler.options.devServer.setupMiddlewares = (middlewares, devServer) => {
        const endpoint = `${normalizedPublicPath}/.well-known/runtime-app-configuration`;

        devServer.app?.get(endpoint, (_req, res) => {
          res.set(this.headers);
          res.json(this.config);
        });

        if (originalSetupMiddlewares) {
          return originalSetupMiddlewares(middlewares, devServer);
        }
        return middlewares;
      };
    }
  }
}

const deps = packageJson.dependencies;

const isProduction = process.env.NODE_ENV === 'production';

let version = process.env.VERSION;
if (!version) {
  const versionFileContents = fs.readFileSync(path.join(__dirname, '../VERSION'), { encoding: 'utf-8' });
  const versionRegex =
    /.*VERSION_MAJOR=(?<versionMajor>\d+)(\n){0,1}.*VERSION_MINOR=(?<versionMinor>\d+)(\n){0,1}.*VERSION_PATCH=(?<versionPatch>\d+)(\n){0,1}.*VERSION_SUFFIX=(?<versionSuffix>.*)/m;
  const { versionMajor, versionMinor, versionPatch, versionSuffix } = versionRegex.exec(versionFileContents).groups;
  version = `${versionMajor}.${versionMinor}.${versionPatch}${versionSuffix}`;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization',
};

const config: Configuration = {
  experiments: {
    css: true,
  },
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
        './AlertsNavbarUpdater': './src/components/AlertNavbarUpdaterComponent.tsx',
        './Metalk8sLocalVolumeProvider': './src/services/k8s/Metalk8sLocalVolumeProvider.ts',
      },
      remotes: !isProduction
        ? {
            shell: 'shell@http://localhost:8084/shell/mf-manifest.json',
          }
        : undefined,
      shared: {
        ...Object.fromEntries(Object.entries(deps).map(([key, version]) => [key, {}])),
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
    new MicroAppRuntimeConfigurationPlugin(
      {
        kind: 'MicroAppRuntimeConfiguration',
        apiVersion: 'ui.scality.com/v1alpha1',
        metadata: {
          kind: 'metalk8s-ui',
          name: 'metalk8s.eu-west-1',
        },
        spec: {
          title: 'MetalK8s Platform',
          selfConfiguration: {
            url: '/api/kubernetes',
            url_salt: '/api/salt',
            url_prometheus: '/api/prometheus',
            url_grafana: '/grafana',
            url_doc: '/docs',
            url_alertmanager: '/api/alertmanager',
            url_loki: '/api/loki',
            flags: [],
            ui_base_path: '/',
            url_support: 'https://github.com/scality/metalk8s/discussions/new',
          },
          auth: {
            kind: 'OIDC',
            providerUrl: '/oidc',
            redirectUrl: 'http://localhost:8084/',
            clientId: 'metalk8s-ui',
            responseType: 'code',
            scopes: 'openid profile email groups offline_access audience:server:client_id:oidc-auth-client',
            providerLogout: true,
          },
        },
      },
      'METALK8S_RUNTIME_',
      corsHeaders,
    ),
  ],
  devServer: {
    port: 3000,
    hot: !isProduction,
    headers: corsHeaders,
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
