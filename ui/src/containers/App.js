import '@fortawesome/fontawesome-free/css/all.css';

import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Route, Switch } from 'react-router-dom';
import { IntlProvider, addLocaleData } from 'react-intl';
import locale_en from 'react-intl/locale-data/en';
import locale_fr from 'react-intl/locale-data/fr';
import Loader from '../components/Loader';

import translations_en from '../translations/en';
import translations_fr from '../translations/fr';

import Layout from './Layout';
import Login from './Login';

import IntlGlobalProvider from '../translations/IntlGlobalProvider';
import { fetchConfigAction, setInitialLanguageAction } from '../ducks/config';
import { initToggleSideBarAction } from '../ducks/app/layout';

const messages = {
  EN: translations_en,
  FR: translations_fr,
};

addLocaleData([...locale_en, ...locale_fr]);

const App = props => {
  const { language, api, theme } = useSelector(state => state.config);
  const isUserInfoLoaded = useSelector(state => state.login.isUserInfoLoaded);
  const dispatch = useDispatch();

  useEffect(() => {
    document.title = messages[language].product_name;
    dispatch(fetchConfigAction());
    dispatch(setInitialLanguageAction());
    dispatch(initToggleSideBarAction());
  }, [language, dispatch]);

  return api && theme && isUserInfoLoaded ? (
    <IntlProvider locale={language} messages={messages[language]}>
      <IntlGlobalProvider>
        <Switch>
          <Route path="/login" component={Login} />
          <Route component={Layout} />
        </Switch>
      </IntlGlobalProvider>
    </IntlProvider>
  ) : (
    <Loader />
  );
};

export default App;
