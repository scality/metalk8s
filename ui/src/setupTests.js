import { setupMock as setupLocalStorageMock } from './tests/mocks/localStorage';
import '@testing-library/jest-dom/extend-expect';
import 'babel-polyfill';

setupLocalStorageMock();
