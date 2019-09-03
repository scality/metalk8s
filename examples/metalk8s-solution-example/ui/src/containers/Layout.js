import React from 'react';
import { connect } from 'react-redux';
import { injectIntl } from 'react-intl';
import { ThemeProvider } from 'styled-components';
import { matchPath } from 'react-router';
import { Layout as CoreUILayout, Notifications } from '@scality/core-ui';
import { withRouter, Switch } from 'react-router-dom';

import { removeNotificationAction } from '../ducks/app/notifications';
import CustomResource from './CustomResource';
import CustomresourceCreation from './CustomresourceCreation';
import CustomresourceEdit from './CustomresourceEdit';

import Welcome from '../components/Welcome';
import PrivateRoute from './PrivateRoute';
import { logoutAction } from '../ducks/login';
import { toggleSidebarAction } from '../ducks/app/layout';

import {
  refreshCustomResourceAction,
  stopRefreshCustomResourceAction
} from '../ducks/app/customResource.js';

import {
  refreshNamespacesAction,
  stopRefreshNamespacesAction
} from '../ducks/app/namespaces.js';

import { useRefreshEffect } from '../services/utils';

const Layout = props => {
  useRefreshEffect(
    refreshCustomResourceAction,
    stopRefreshCustomResourceAction
  );
  useRefreshEffect(refreshNamespacesAction, stopRefreshNamespacesAction);

  const applications = [];

  const help = [
    {
      label: props.intl.messages.about,
      onClick: () => {
        props.history.push('/about');
      }
    }
  ];

  const user = {
    name: props.user && props.user.username,
    actions: [{ label: props.intl.messages.log_out, onClick: props.logout }]
  };

  const sidebar = {
    expanded: props.sidebar.expanded,
    actions: [
      {
        label: props.intl.messages.custom_resource,
        icon: <i className="fas fa-server" />,
        onClick: () => {
          props.history.push('/');
        },
        active:
          matchPath(props.history.location.pathname, {
            path: '/',
            exact: true,
            strict: true
          }) ||
          matchPath(props.history.location.pathname, {
            path: '/customResource',
            exact: false,
            strict: true
          })
      }
    ]
  };

  const navbar = {
    onToggleClick: props.toggleSidebar,
    toggleVisible: true,
    productName: props.intl.messages.product_name,
    applications,
    help,
    user: props.user && user,
    logo: (
      <img
        alt="logo"
        src={process.env.PUBLIC_URL + '/brand/assets/branding.svg'}
      />
    )
  };

  return (
    <ThemeProvider theme={props.theme}>
      <CoreUILayout sidebar={sidebar} navbar={navbar}>
        <Notifications
          notifications={props.notifications}
          onDismiss={props.removeNotification}
        />
        <Switch>
          <PrivateRoute exact path="/about" component={Welcome} />
          <PrivateRoute
            exact
            path="/customResource"
            component={CustomResource}
          />
          <PrivateRoute
            exact
            path="/customResource/:id/edit"
            component={CustomresourceEdit}
          />
          <PrivateRoute
            exact
            path="/customResource/create"
            component={CustomresourceCreation}
          />
          <PrivateRoute exact path="/" component={CustomResource} />
        </Switch>
      </CoreUILayout>
    </ThemeProvider>
  );
};

const mapStateToProps = state => ({
  user: state.login.user,
  sidebar: state.app.layout.sidebar,
  theme: state.config.theme,
  notifications: state.app.notifications.list
});

const mapDispatchToProps = dispatch => {
  return {
    logout: () => dispatch(logoutAction()),
    toggleSidebar: () => dispatch(toggleSidebarAction()),
    removeNotification: uid => dispatch(removeNotificationAction(uid))
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
