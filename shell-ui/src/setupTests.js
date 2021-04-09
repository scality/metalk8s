import fetch from 'node-fetch';
import 'regenerator-runtime/runtime';
import '@testing-library/jest-dom/extend-expect';
import 'jest-localstorage-mock';

const nodeCrypto = require('crypto');
window.crypto = {
  getRandomValues: function (buffer) {
    return nodeCrypto.randomFillSync(buffer);
  },
};

window.fetch = (url, ...rest) => fetch(
	/^https?:/.test(url) ? url : new URL(url, 'http://localhost'),
	...rest
);
