const webpack = require('webpack');

module.exports = commonPaths => ({
  mode: 'development',
  devtool: 'inline-source-map',
  entry: commonPaths.entry,
  output: {
    filename: '[name].js',
    path: commonPaths.outputPath,
    chunkFilename: '[name].[contenthash].js',
  },
  optimization: {
    namedModules: true,
    namedChunks: true,
    runtimeChunk: {
      name: 'webpackRuntime',
    },
    splitChunks: {
      chunks: 'all',
    },
  },
  devServer: {
    contentBase: commonPaths.outputPath,
    compress: true,
    hot: true,
    port: `${commonPaths.port}`,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
    },
  },
  plugins: [],
});
