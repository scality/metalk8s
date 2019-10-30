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

import { fetchConfigAction } from '../ducks/config';

const messages = {
  en: translations_en,
  fr: translations_fr
};

addLocaleData([...locale_en, ...locale_fr]);

const App = props => {
  const dispatch = useDispatch();
  const { language, api, theme } = useSelector(state => state.config);
  const isUserInfoLoaded = useSelector(state => state.login.isUserInfoLoaded);
  useEffect(() => {
    document.title = messages[language].product_name;
    dispatch(fetchConfigAction());
  }, []);
  return api && theme && isUserInfoLoaded ? (
    <IntlProvider locale={language} messages={messages[language]}>
      <Switch>
        <Route path="/login" component={Login} />
        <Route component={Layout} />
      </Switch>
    </IntlProvider>
  ) : (
    <Loader />
  );
};

export default App;
