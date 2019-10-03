import '@fortawesome/fontawesome-free/css/all.css';

import React, { Component } from 'react';
import { connect } from 'react-redux';
import { withRouter, Route, Switch } from 'react-router-dom';
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

class App extends Component {
  componentDidMount() {
    document.title = messages[this.props.config.language].product_name;
    this.props.fetchConfig();
  }

  render() {
    const { language, api, theme } = this.props.config;

    return api && theme && this.props.isUserInfoLoaded ? (
      <IntlProvider locale={language} messages={messages[language]}>
        <Switch>
          <Route path="/login" component={Login} />
          <Route component={Layout} />
        </Switch>
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
    fetchConfig: () => dispatch(fetchConfigAction())
  };
};

export default withRouter(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )(App)
);
