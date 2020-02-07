const path = require('path');

module.exports = port => ({
  root: path.resolve(__dirname, '../'),
  outputPath: path.resolve(__dirname, '../build'),
  entry: require.resolve(`../src/micro-app.js`),
  imagesFolder: 'images',
  fontsFolder: 'fonts',
  cssFolder: 'css',
  jsFolder: 'js',
  port,
});
