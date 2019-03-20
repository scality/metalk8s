import React, { Component } from 'react';
import { connect } from 'react-redux';
import { injectIntl } from 'react-intl';
import { ThemeProvider } from 'styled-components';
import { matchPath } from 'react-router';
import { Layout as CoreUILayout } from 'core-ui';
import { withRouter, Switch } from 'react-router-dom';

import NodeList from './NodeList';
import Welcome from '../components/Welcome';
import PrivateRoute from './PrivateRoute';
import { logoutAction } from '../ducks/login';
import { toggleSidebarAction } from '../ducks/app/layout';

class Layout extends Component {
  render() {
    const applications = [];

    const help = [
      {
        label: this.props.intl.messages.about,
        onClick: () => {
          this.props.history.push('/about');
        }
      }
    ];

    const user = {
      name: this.props.user && this.props.user.username,
      actions: [
        { label: this.props.intl.messages.log_out, onClick: this.props.logout }
      ]
    };

    const sidebar = {
      expanded: this.props.sidebar.expanded,
      actions: [
        {
          label: this.props.intl.messages.nodes,
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
      productName: this.props.intl.messages.product_name,
      applications,
      help,
      user: this.props.user && user,
      logo: (
        <img
          alt="logo"
          src={process.env.PUBLIC_URL + '/brand/assets/branding.svg'}
        />
      )
    };

    const theme = {
      brand: {
        primary: '#283593'
      }
    };

    return (
      <ThemeProvider theme={theme}>
        <CoreUILayout sidebar={sidebar} navbar={navbar}>
          <Switch>
            <PrivateRoute exact path="/nodes" component={NodeList} />
            <PrivateRoute exact path="/about" component={Welcome} />
            <PrivateRoute exact path="/" component={NodeList} />
          </Switch>
        </CoreUILayout>
      </ThemeProvider>
    );
  }
}

const mapStateToProps = state => ({
  user: state.login.user,
  sidebar: state.app.layout.sidebar
});

const mapDispatchToProps = dispatch => {
  return {
    logout: () => dispatch(logoutAction()),
    toggleSidebar: () => dispatch(toggleSidebarAction())
  };
};

export default injectIntl(
  withRouter(
    connect(
      mapStateToProps,
      mapDispatchToProps
    )(Layout)
  )
);
