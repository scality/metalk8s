import React, { Component } from 'react';
import { connect } from 'react-redux';
import { withRouter, Route, Switch } from 'react-router-dom';
import { IntlProvider, addLocaleData } from 'react-intl';
import locale_en from 'react-intl/locale-data/en';
import locale_fr from 'react-intl/locale-data/fr';
import '@fortawesome/fontawesome-free/css/all.css';

import translations_en from '../translations/en';
import translations_fr from '../translations/fr';

import Layout from './Layout';
import Login from './Login';

import { fetchApiConfigAction } from '../ducks/config';

const messages = {
  en: translations_en,
  fr: translations_fr
};

addLocaleData([...locale_en, ...locale_fr]);

class App extends Component {
  componentDidMount() {
    document.title = messages[this.props.config.language].product_name;
    this.props.fetchApiConfig();
  }

  render() {
    const { language, api } = this.props.config;
    return api ? (
      <IntlProvider locale={language} messages={messages[language]}>
        <Switch>
          <Route path="/login" component={Login} />
          <Route component={Layout} />
        </Switch>
      </IntlProvider>
    ) : null;
  }
}

const mapStateToProps = state => ({
  config: state.config
});

const mapDispatchToProps = dispatch => {
  return {
    fetchApiConfig: () => dispatch(fetchApiConfigAction())
  };
};

export default withRouter(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )(App)
);
