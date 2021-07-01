const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin');
const HtmlWebPackPlugin = require('html-webpack-plugin');
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
  resolve: {
    modules: ['node_modules'],
    extensions: ['.js', '.jsx', '.css', '.json'],
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
        './moduleFederation/ConfigurationProvider':
          './src/initFederation/ConfigurationProviders.js',
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
      },
    }),
    new HtmlWebPackPlugin({
      template: '!!handlebars-loader!./index-template.html',
      filename: './index.html',
    }),
  ],
};
