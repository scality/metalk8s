const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin');
const deps = require('./package.json').dependencies;

module.exports = {
  module: {
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
  plugins: (prefix = '') => [
    new ModuleFederationPlugin({
      name: 'shell',
      filename: `${prefix}remoteEntry.js`,
      exposes: {
        './App': './src/FederatedApp.jsx',
        './lang': './src/navbar/lang.js',
        './auth/AuthProvider': './src/auth/AuthProvider.js',
        './alerts/AlertProvider': './src/alerts/AlertProvider.js',
        './alerts/alertHooks': './src/alerts/alertHooks.js',
      },
      shared: {
        ...Object.fromEntries(
          Object.entries(deps).map(([key, version]) => [
            key,
            {
              eager: true,
            },
          ]),
        ),
        '@scality/core-ui': {
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
      },
    }),
  ],
};
