import React, { Component } from 'react';
import { connect } from 'react-redux';
import { withRouter, Route, Switch } from 'react-router-dom';
import { IntlProvider, addLocaleData } from 'react-intl';
import locale_en from 'react-intl/locale-data/en';
import locale_fr from 'react-intl/locale-data/fr';
import '@fortawesome/fontawesome-free/css/all.css';
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
  FR: translations_fr
};

addLocaleData([...locale_en, ...locale_fr]);

class App extends Component {
  componentDidMount() {
    document.title = messages[this.props.config.language].product_name;
    this.props.fetchConfig();
    this.props.setInitialLanguage();
    this.props.initToggleSideBar();
  }

  render() {
    const { language, api, theme } = this.props.config;

    return api && theme && this.props.isUserInfoLoaded ? (
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
  }
}

const mapStateToProps = state => ({
  config: state.config,
  isUserInfoLoaded: state.login.isUserInfoLoaded
});

const mapDispatchToProps = dispatch => {
  return {
    fetchConfig: () => dispatch(fetchConfigAction()),
    setInitialLanguage: () => dispatch(setInitialLanguageAction()),
    initToggleSideBar: () => dispatch(initToggleSideBarAction())
  };
};

export default withRouter(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )(App)
);
