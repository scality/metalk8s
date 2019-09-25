import React from 'react';
import { connect } from 'react-redux';
import { injectIntl } from 'react-intl';
import { ThemeProvider } from 'styled-components';
import { matchPath } from 'react-router';
import { Layout as CoreUILayout, Notifications } from '@scality/core-ui';
import { withRouter, Switch } from 'react-router-dom';

import { removeNotificationAction } from '../ducks/app/notifications';

import ClockServerCreation from './ClockServerCreation';
import ClockServerEdit from './ClockServerEdit';
import VersionServerCreation from './VersionServerCreation';
import VersionServerEdit from './VersionServerEdit';
import Stack from './Stack';
import StackDetail from './StackDetail';

import Welcome from '../components/Welcome';
import PrivateRoute from './PrivateRoute';
import { logoutAction } from '../ducks/login';
import { toggleSidebarAction } from '../ducks/app/layout';

import { refreshStackAction, stopRefreshStackAction } from '../ducks/app/stack';

import { useRefreshEffect } from '../services/utils';

const Layout = props => {
  useRefreshEffect(refreshStackAction, stopRefreshStackAction);

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
        label: props.intl.messages.stacks,
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
            path: '/stacks',
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
            path="/stacks/:name/version/:version/clockServer/create"
            component={ClockServerCreation}
          />
          <PrivateRoute
            exact
            path="/stacks/:name/version/:version/clockServer/:id/edit"
            component={ClockServerEdit}
          />
          <PrivateRoute
            exact
            path="/stacks/:name/version/:version/versionServer/create"
            component={VersionServerCreation}
          />
          <PrivateRoute
            exact
            path="/stacks/:name/version/:version/versionServer/:id/edit"
            component={VersionServerEdit}
          />
          <PrivateRoute
            path="/stacks/:name/version/:version/prepare"
            component={StackDetail}
          />
          <PrivateRoute exact path="/stacks" component={Stack} />
          <PrivateRoute exact path="/" component={Stack} />
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
