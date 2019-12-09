import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { injectIntl } from 'react-intl';
import { ThemeProvider } from 'styled-components';
import { useRouteMatch, useHistory } from 'react-router';
import { Layout as CoreUILayout, Notifications } from '@scality/core-ui';
import { Switch } from 'react-router-dom';

import { removeNotificationAction } from '../ducks/app/notifications';

import ClockServerCreation from './ClockServerCreation';
import ClockServerEdit from './ClockServerEdit';
import VersionServerCreation from './VersionServerCreation';
import VersionServerEdit from './VersionServerEdit';
import Environment from './EnvironmentsList';
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
  const user = useSelector(state => state.login.user);
  const sidebar = useSelector(state => state.app.layout.sidebar);
  const theme = useSelector(state => state.config.theme);
  const notifications = useSelector(state => state.app.notifications.list);
  const dispatch = useDispatch();
  const logout = () => dispatch(logoutAction());
  const toggleSidebar = () => dispatch(toggleSidebarAction());
  const removeNotification = uid => dispatch(removeNotificationAction(uid));
  const fetchVersions = () => dispatch(fetchVersionsAction());
  const { intl } = props;
  const history = useHistory();

  useRefreshEffect(refreshEnvironmentAction, stopRefreshEnvironmentAction);
  useEffect(() => {
    fetchVersions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sidebarConfig = {
    expanded: sidebar.expanded,
    actions: [
      {
        label: intl.messages.environments,
        icon: <i className="fas fa-server" />,
        onClick: () => {
          history.push('/');
        },
        active:
          useRouteMatch({
            path: '/',
            exact: true,
            strict: true
          }) ||
          useRouteMatch({
            path: '/environments',
            exact: false,
            strict: true
          })
      }
    ]
  };

  const rightActions = [
    {
      type: 'dropdown',
      icon: <i className="fas fa-question-circle" />,
      items: [
        {
          label: intl.messages.about,
          onClick: () => {
            history.push('/about');
          }
        }
      ]
    },
    {
      type: 'dropdown',
      text: user && user.username,
      icon: <i className="fas fa-user" />,
      items: [{ label: intl.messages.log_out, onClick: logout }]
    }
  ];

  const navbar = {
    onToggleClick: toggleSidebar,
    productName: intl.messages.product_name,
    rightActions,
    logo: (
      <img
        alt="logo"
        src={process.env.PUBLIC_URL + '/brand/assets/branding.svg'}
      />
    )
  };

  return (
    <ThemeProvider theme={theme}>
      <CoreUILayout sidebar={sidebarConfig} navbar={navbar}>
        <Notifications
          notifications={notifications}
          onDismiss={removeNotification}
        />
        <Switch>
          <PrivateRoute exact path="/about" component={Welcome} />
          <PrivateRoute
            exact
            path="/environments/:name/clock-server/create"
            component={ClockServerCreation}
          />
          <PrivateRoute
            exact
            path="/environments/:name/clock-server/:id/edit"
            component={ClockServerEdit}
          />
          <PrivateRoute
            exact
            path="/environments/:name/version-server/create"
            component={VersionServerCreation}
          />
          <PrivateRoute
            exact
            path="/environments/:name/version-server/:id/edit"
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

export default injectIntl(Layout);
