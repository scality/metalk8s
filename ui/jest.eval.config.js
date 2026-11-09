// The WebMCP eval's own jest config, separate from the one in package.json.
//
// Two reasons it cannot share the ordinary setup:
//
//   1. It runs in `node`, not jsdom. The eval drives an HTTP API, reads a token file and touches
//      no DOM; the package is a Node package and says so.
//   2. `src/setupTests.tsx` assigns `window.fetch` at module scope, so running it under `node`
//      throws `ReferenceError: window is not defined` before any test starts.
//
// Named jest.eval.config.js rather than jest.config.js on purpose: jest auto-discovers the latter
// and would then complain about two configurations, since package.json already carries one.

const base = require('./package.json').jest;

module.exports = {
  ...base,
  testEnvironment: 'node',
  setupFilesAfterEnv: [],
  testPathIgnorePatterns: ['/node_modules/'],
  testMatch: ['<rootDir>/src/**/*.eval.test.ts'],
};
