import '@fortawesome/fontawesome-free/css/all.css';

import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { IntlProvider, addLocaleData } from 'react-intl';
import locale_en from 'react-intl/locale-data/en';
import locale_fr from 'react-intl/locale-data/fr';
import { QueryClient, QueryClientProvider } from 'react-query';
import translations_en from '../translations/en';
import translations_fr from '../translations/fr';
import Layout from './Layout';
import IntlGlobalProvider from '../translations/IntlGlobalProvider';
import { fetchConfigAction, setInitialLanguageAction } from '../ducks/config';
import { initToggleSideBarAction } from '../ducks/app/layout';
import Loader from '../components/Loader';

const queryClient = new QueryClient();
const messages = {
  EN: translations_en,
  FR: translations_fr,
};

addLocaleData([...locale_en, ...locale_fr]);

const App = (props) => {
  const { language, api, theme } = useSelector(
    (state) => state.config,
  );
  const dispatch = useDispatch();

  useEffect(() => {
    document.title = messages[language].product_name;
    dispatch(fetchConfigAction());
    dispatch(setInitialLanguageAction());// todo removes this once the navbar provides it 
    dispatch(initToggleSideBarAction());
    // eslint-disable-next-line
  }, []);

  return api && theme ? (
    <QueryClientProvider client={queryClient}>
        <IntlProvider locale={language} messages={messages[language]}>
          <IntlGlobalProvider>
            <Layout />
          </IntlGlobalProvider>
        </IntlProvider>
    </QueryClientProvider>
  ) : <Loader />;
};

export default App;
