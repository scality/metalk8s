const HtmlWebPackPlugin = require("html-webpack-plugin");
const {DefinePlugin} = require("webpack")
module.exports = {
  mode: "development",
  devtool: "source-map",
  entry: "./index.js",
  module: {
    // ...
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
        },
      },
      {
        test: /\.mdx?$/,
        use: ["babel-loader", "@mdx-js/loader"],
      }
    ],
  },
  devServer: {
        port: process.env.PORT || 8082,
        historyApiFallback: true
      },
  plugins: [
    new DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify('development')
      }
    }),
    new HtmlWebPackPlugin({
      template: "./index-template.html",
    })
  ],
};
