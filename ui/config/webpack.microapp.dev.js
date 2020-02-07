/* eslint-env node */
const config = require('./webpack.microapp.config.js');
config.devServer = {
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
      'Origin, X-Requested-With, Content-Type, Accept, Range',
  },
  clientLogLevel: 'info',
};

config.mode = 'development';

module.exports = config;
