import fetch from 'node-fetch';
import { setupMock as setupLocalStorageMock } from './tests/mocks/localStorage';
import '@testing-library/jest-dom/extend-expect';
import 'babel-polyfill';
setupLocalStorageMock();

window.fetch = (url, ...rest) =>
  fetch(/^https?:/.test(url) ? url : new URL(url, 'http://localhost'), ...rest);

jest.mock('./containers/ConfigProvider', () => ({
  __esModule: true,
  default: ({ children }) => <>{children}</>,
}));