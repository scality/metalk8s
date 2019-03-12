import React, { Component } from 'react';
import { connect } from 'react-redux';
import { withRouter, Switch, Route } from 'react-router-dom';
import { IntlProvider, addLocaleData } from 'react-intl';
import { ThemeProvider } from 'styled-components';
import locale_en from 'react-intl/locale-data/en';
import locale_fr from 'react-intl/locale-data/fr';

import { Layout } from 'core-ui';
import '@fortawesome/fontawesome-free/css/all.css';

import translations_en from '../translations/en';
import translations_fr from '../translations/fr';
import { fetchUsersAction } from '../ducks/users';

import UserList from './UserList';
import Welcome from '../components/Welcome';
import Login from './Login';
import PrivateRoute from './PrivateRoute';

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

  componentDidMount() {
    this.props.fetchUsers();
  }

  render() {
    const applications = [{ label: 'Hyperdrive UI', onClick: () => {} }];

    const help = [
      {
        label: 'About',
        onClick: () => {
          this.props.history.push('/about');
        }
      },
      {
        label: 'Users',
        onClick: () => {
          this.props.history.push('/users');
        }
      }
    ];

    const user = {
      name: 'John Doe',
      actions: [{ label: 'Log out', onClick: () => {} }]
    };

    const sidebar = {
      expanded: true,
      actions: [
        {
          label: 'Nodes',
          icon: <i className="fas fa-server" />,
          onClick: () => {},
          active: true
        }
      ]
    };

    const navbar = {
      onToggleClick: () => {},
      toggleVisible: true,
      productName: 'MetalK8s Platform',
      applications,
      help,
      user
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
              <div>
                <PrivateRoute exact path="/users" component={UserList} />
                <PrivateRoute exact path="/about" component={Welcome} />
                <PrivateRoute exact path="/" component={UserList} />
              </div>
            </Layout>
          </ThemeProvider>
        </Switch>
      </IntlProvider>
    );
  }
}

const mapStateToProps = state => ({
  language: state.language.lang
});

const mapDispatchToProps = dispatch => {
  return {
    fetchUsers: () => dispatch(fetchUsersAction())
  };
};

export default withRouter(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )(App)
);
