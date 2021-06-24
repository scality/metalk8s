import { IntlProvider } from 'react-intl';
import IntlGlobalProvider from './translations/IntlGlobalProvider';
import translations_en from './translations/en';
import { setupMock as setupLocalStorageMock } from './tests/mocks/localStorage';
import '@testing-library/jest-dom/extend-expect';
import 'babel-polyfill';

const intlProvider = new IntlProvider({
  locale: 'en',
  messages: translations_en,
});
const { intl } = intlProvider.getChildContext();

// Setup i18n (used in sagas)
IntlGlobalProvider({}, { intl });

setupLocalStorageMock();
