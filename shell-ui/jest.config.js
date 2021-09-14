module.exports = {
  transformIgnorePatterns: ['/node_modules/(?!vega-lite|react-to-webcomponent)'],
  setupFilesAfterEnv: ['./src/setupTests.js'],
  clearMocks: true,
  moduleNameMapper: {
    '\\.(css|less)$': 'identity-obj-proxy',
  },
};
