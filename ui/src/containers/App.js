import '@fortawesome/fontawesome-free/css/all.css';

import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { IntlProvider, addLocaleData } from 'react-intl';
import locale_en from 'react-intl/locale-data/en';
import locale_fr from 'react-intl/locale-data/fr';
import { OidcProvider } from 'redux-oidc';
import { Route, Switch } from 'react-router-dom';

import translations_en from '../translations/en';
import translations_fr from '../translations/fr';
import Loader from '../components/Loader';
import Layout from './Layout';
import CallbackPage from './LoginCallback';
import IntlGlobalProvider from '../translations/IntlGlobalProvider';
import { fetchConfigAction, setInitialLanguageAction } from '../ducks/config';
import { initToggleSideBarAction } from '../ducks/app/layout';
import { store } from '../index';

const messages = {
  EN: translations_en,
  FR: translations_fr,
};

addLocaleData([...locale_en, ...locale_fr]);

const App = (props) => {
  const { language, api, theme, userManager } = useSelector(
    (state) => state.config,
  );
  const isUserLoaded = useSelector((state) => state.config.isUserLoaded);
  const dispatch = useDispatch();

  useEffect(() => {
    document.title = messages[language].product_name;
    dispatch(fetchConfigAction());
    dispatch(setInitialLanguageAction());
    dispatch(initToggleSideBarAction());
    // eslint-disable-next-line
  }, []);

  return api && theme && userManager && isUserLoaded ? (
    <OidcProvider store={store} userManager={userManager}>
      <IntlProvider locale={language} messages={messages[language]}>
        <IntlGlobalProvider>
          <Switch>
            <Route
              exact
              path="/oauth2/callback"
              component={() => <CallbackPage />}
            />
            <Route component={Layout} />
          </Switch>
        </IntlGlobalProvider>
      </IntlProvider>
    </OidcProvider>
  ) : (
    <Loader />
  );
};

export default App;
