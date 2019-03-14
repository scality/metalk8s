import React, { Component } from 'react';
import { connect } from 'react-redux';
import { withRouter, Switch, Route } from 'react-router-dom';
import { IntlProvider, addLocaleData } from 'react-intl';
import { ThemeProvider } from 'styled-components';
import locale_en from 'react-intl/locale-data/en';
import locale_fr from 'react-intl/locale-data/fr';
import { matchPath } from 'react-router';
import { Layout } from 'core-ui';
import '@fortawesome/fontawesome-free/css/all.css';

import translations_en from '../translations/en';
import translations_fr from '../translations/fr';

import NodeList from './NodeList';
import Welcome from '../components/Welcome';
import Login from './Login';
import PrivateRoute from './PrivateRoute';
import { logoutAction } from '../ducks/login';
import { toggleSidebarAction } from '../ducks/app';

const messages = {
  en: translations_en,
  fr: translations_fr
};

addLocaleData([...locale_en, ...locale_fr]);

class App extends Component {
  // componentDidMount = () => {
  //   fetch("/brand/theme.json")
  //     .then(r => r.json())
  //     .then(data => {
  //       console.log("json", data);
  //     });
  // };

  render() {
    const applications = [{ label: 'Hyperdrive UI', onClick: () => {} }];

    const help = [
      {
        label: 'About',
        onClick: () => {
          this.props.history.push('/about');
        }
      }
    ];

    const user = {
      name: this.props.user && this.props.user.username,
      actions: [{ label: 'Log out', onClick: this.props.logout }]
    };

    const sidebar = {
      expanded: this.props.sidebar.expanded,
      actions: [
        {
          label: 'Nodes',
          icon: <i className="fas fa-server" />,
          onClick: () => {
            this.props.history.push('/nodes');
          },
          active:
            matchPath(this.props.history.location.pathname, {
              path: '/',
              exact: true,
              strict: true
            }) ||
            matchPath(this.props.history.location.pathname, {
              path: '/nodes',
              exact: true,
              strict: true
            })
        }
      ]
    };

    const navbar = {
      onToggleClick: this.props.toggleSidebar,
      toggleVisible: true,
      productName: 'MetalK8s Platform',
      applications,
      help,
      user: this.props.user && user
    };

    const theme = {
      brand: {
        primary: '#1A237E'
      }
    };

    return (
      <IntlProvider
        locale={this.props.language}
        messages={messages[this.props.language]}
      >
        <Switch>
          <Route path="/login" component={Login} />
          <ThemeProvider theme={theme}>
            <Layout sidebar={sidebar} navbar={navbar}>
              <PrivateRoute exact path="/nodes" component={NodeList} />
              <PrivateRoute exact path="/about" component={Welcome} />
              <PrivateRoute exact path="/" component={NodeList} />
            </Layout>
          </ThemeProvider>
        </Switch>
      </IntlProvider>
    );
  }
}

const mapStateToProps = state => ({
  language: state.language.lang,
  user: state.login.user,
  sidebar: state.app.sidebar
});

const mapDispatchToProps = dispatch => {
  return {
    logout: () => dispatch(logoutAction()),
    toggleSidebar: () => dispatch(toggleSidebarAction())
  };
};

export default withRouter(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )(App)
);
