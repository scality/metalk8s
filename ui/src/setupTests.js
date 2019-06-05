import { IntlProvider, addLocaleData } from 'react-intl';
import IntlGlobalProvider from './translations/IntlGlobalProvider';
import translations_en from './translations/en';

const intlProvider = new IntlProvider({
  locale: 'en',
  messages: translations_en
});
const { intl } = intlProvider.getChildContext();

//init to test i18n in sagas
IntlGlobalProvider({}, { intl });
