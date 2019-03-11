import React, { Component } from 'react';
import { connect } from 'react-redux';
import { withRouter, Switch, Route } from 'react-router-dom';
import { IntlProvider, addLocaleData } from 'react-intl';
import { ThemeProvider } from 'styled-components';
import locale_en from 'react-intl/locale-data/en';
import locale_fr from 'react-intl/locale-data/fr';

import { Layout } from 'scality-ui';
import '@fortawesome/fontawesome-free/css/all.css';

import translations_en from '../translations/en';
import translations_fr from '../translations/fr';
import { fetchUsersAction } from '../ducks/users';

import UserList from './UserList';
import Welcome from '../components/Welcome';

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
    const applications = [{ label: 'Platform UI', onClick: () => {} }];

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
      actions: []
    };

    const navbar = {
      onToggleClick: () => {},
      toggleVisible: true,
      productName: 'Template UI',
      applications,
      help,
      user
    };

    const theme = {
      brand: {
        primary: '#006F62'
      }
    };

    return (
      <IntlProvider
        locale={this.props.language}
        messages={messages[this.props.language]}
      >
        <ThemeProvider theme={theme}>
          <Layout sidebar={sidebar} navbar={navbar}>
            <div>
              <Switch>
                <Route path="/users" component={UserList} />
                <Route path="/about" component={Welcome} />
                <Route path="/" component={Welcome} />
              </Switch>
            </div>
          </Layout>
        </ThemeProvider>
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
