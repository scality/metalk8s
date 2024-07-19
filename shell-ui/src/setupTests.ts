import fetch from 'node-fetch';
import 'regenerator-runtime/runtime';
import '@testing-library/jest-dom/extend-expect';
import 'jest-localstorage-mock';

const nodeCrypto = require('crypto');

// @ts-expect-error - FIXME when you are working on it
window.crypto = {
  getRandomValues: function (buffer) {
    return nodeCrypto.randomFillSync(buffer);
  },
};

window.fetch = (url, ...rest) =>
  // @ts-expect-error - FIXME when you are working on it
  fetch(/^https?:/.test(url) ? url : new URL(url, 'http://localhost'), ...rest);

const DOMRect = jest.fn(() => ({
  x: 1796.453125,
  y: 0,
  width: 79.546875,
  height: 55.671875,
  top: 0,
  right: 1876,
  bottom: 55.671875,
  left: 1796.453125,
}));

Object.defineProperty(window, 'DOMRect', {
  value: DOMRect,
  writable: true,
});

export function mockOidcReact() {
  const { jest } = require('@jest/globals');

  const original = jest.requireActual('oidc-react');
  return {
    ...original,
    //Pass down all the exported objects
    useAuth: jest.fn().mockImplementation(() => ({
      userData: {
        profile: {
          groups: ['PlatformAdmin'],
          email: 'test@test.invalid',
          name: 'user',
          sub: 'userID',
        },
      },
    })),
  };
}

jest.mock('oidc-react', () => mockOidcReact());

jest.mock('@module-federation/enhanced/runtime', () => {}, { virtual: true });
