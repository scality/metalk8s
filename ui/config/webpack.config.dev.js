/* eslint-env node */
const config = require('./webpack.config.js');
config.devServer = {
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers':
      'X-Requested-With, content-type, Authorization',
  },
};
config.mode = 'development';
module.exports = config;
