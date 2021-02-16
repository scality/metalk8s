const path = require("path");
const {name, version} = require("./package.json");
const {DefinePlugin} = require("webpack");
module.exports = {
  mode: "production",
  devtool: false,
  entry: "./src/index.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: `${name}.${version}.js`,
  },
  module: {
    // ...
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
        },
      }
    ],
  },
  plugins: [
    new DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify('production')
      }
    }),
  ]
};
