module.exports = {
  transformIgnorePatterns: [
    '/node_modules/(?!vega-lite|@scality|pretty-bytes|react-to-webcomponent)',
  ],
  setupFilesAfterEnv: ['./src/setupTests.ts'],
  clearMocks: true,
  moduleNameMapper: {
    '\\.(css|less)$': 'identity-obj-proxy',
  },
};
