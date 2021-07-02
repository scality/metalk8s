module.exports = {
  transformIgnorePatterns: ['/node_modules/(?!react-to-webcomponent)'],
  setupFilesAfterEnv: ['./src/setupTests.js'],
  clearMocks: true,
  moduleNameMapper: {
    '\\.(css|less)$': 'identity-obj-proxy',
  },
};
