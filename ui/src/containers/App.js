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

const messages = {
  en: translations_en,
  fr: translations_fr
};

addLocaleData([...locale_en, ...locale_fr]);

class App extends Component {
  componentDidMount() {
    document.title = messages[this.props.language].title;
  }

  render() {
    return (
      <IntlProvider
        locale={this.props.language}
        messages={messages[this.props.language]}
      >
        <Switch>
          <Route path="/login" component={Login} />
          <Route component={Layout} />
        </Switch>
      </IntlProvider>
    );
  }
}

const mapStateToProps = state => ({
  language: state.language.lang
});

export default withRouter(connect(mapStateToProps)(App));
