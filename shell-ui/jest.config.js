module.exports = {
  transformIgnorePatterns: [
    '/node_modules/(?!vega-lite|@scality|pretty-bytes)',
  ],
  setupFilesAfterEnv: ['./src/setupTests.ts'],
  clearMocks: true,
  moduleNameMapper: {
    '\\.(css|less)$': 'identity-obj-proxy',
  },
};
