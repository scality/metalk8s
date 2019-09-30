import React, { useEffect } from 'react';
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
import Environment from './Environment';
import EnvironmentDetail from './EnvironmentDetail';
import EnvironmentPreparation from './EnvironmentPreparation';
import Welcome from '../components/Welcome';
import PrivateRoute from './PrivateRoute';
import { logoutAction } from '../ducks/login';
import { toggleSidebarAction } from '../ducks/app/layout';

import {
  refreshEnvironmentAction,
  stopRefreshEnvironmentAction
} from '../ducks/app/environment';

import { useRefreshEffect } from '../services/utils';
import { fetchVersionsAction } from '../ducks/config';

const Layout = props => {
  useRefreshEffect(refreshEnvironmentAction, stopRefreshEnvironmentAction);
  useEffect(() => {
    props.fetchVersions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        label: props.intl.messages.environments,
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
            path: '/environments',
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
            path="/environments/:name/clockServer/create"
            component={ClockServerCreation}
          />
          <PrivateRoute
            exact
            path="/environments/:name/clockServer/:id/edit"
            component={ClockServerEdit}
          />
          <PrivateRoute
            exact
            path="/environments/:name/versionServer/create"
            component={VersionServerCreation}
          />
          <PrivateRoute
            exact
            path="/environments/:name/versionServer/:id/edit"
            component={VersionServerEdit}
          />
          <PrivateRoute
            exact
            path="/environments/:name/version/:version/prepare"
            component={EnvironmentPreparation}
          />
          <PrivateRoute
            path="/environments/:name"
            component={EnvironmentDetail}
          />
          <PrivateRoute exact path="/environments" component={Environment} />
          <PrivateRoute exact path="/" component={Environment} />
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
    removeNotification: uid => dispatch(removeNotificationAction(uid)),
    fetchVersions: () => dispatch(fetchVersionsAction())
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
