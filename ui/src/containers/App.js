//@flow
import '@fortawesome/fontawesome-free/css/all.css';

import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { IntlProvider, addLocaleData } from 'react-intl';
import locale_en from 'react-intl/locale-data/en';
import locale_fr from 'react-intl/locale-data/fr';
import translations_en from '../translations/en';
import translations_fr from '../translations/fr';
import { Loader } from '@scality/core-ui';
import Layout from './Layout';
import IntlGlobalProvider from '../translations/IntlGlobalProvider';
import { fetchConfigAction } from '../ducks/config';
import { initToggleSideBarAction } from '../ducks/app/layout';
import { useTypedSelector, MetricsTimeSpanProvider } from '../hooks';

const messages = {
  EN: translations_en,
  FR: translations_fr,
};

addLocaleData([...locale_en, ...locale_fr]);

const App = () => {
  const { language, api, theme, status } = useTypedSelector(
    (state) => state.config,
  );

  const dispatch = useDispatch();

  useEffect(() => {
    document.title = messages[language].product_name;
    if (status === 'idle') {
      dispatch(fetchConfigAction());
      dispatch(initToggleSideBarAction());
    }
    // eslint-disable-next-line
  }, [status]);

  return status === 'success' && api && theme ? (
    <IntlProvider locale={language} messages={messages[language.toUpperCase()]}>
      <IntlGlobalProvider>
        <MetricsTimeSpanProvider>
          <Layout />
        </MetricsTimeSpanProvider>
      </IntlGlobalProvider>
    </IntlProvider>
  ) : (
    <Loader size="massive" centered={true} />
  );
};

export default App;
