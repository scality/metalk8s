import React, { useCallback, useEffect, Suspense, useState } from 'react';
import { useDispatch } from 'react-redux';
import { matchPath, RouteProps, Route, Redirect } from 'react-router';
import { useHistory, useLocation, Switch } from 'react-router-dom';
import {
  Notifications,
  Loader,
  ErrorPage404,
  Icon,
  AppContainer,
  Sidebar,
} from '@scality/core-ui';
import { useIntl } from 'react-intl';
import { removeNotificationAction } from '../ducks/app/notifications';
import { setIntlAction } from '../ducks/config';
import CreateVolume from './CreateVolume';
import { useTypedSelector } from '../hooks';

const ConfigureAlerting = React.lazy(
  () => import('../alert-configuration/ConfigureAlerting'),
);
const NodeCreateForm = React.lazy(() => import('./NodeCreateForm'));
const NodePage = React.lazy(() => import('./NodePage'));
const About = React.lazy(() => import('./About'));
const PrivateRoute = React.lazy(() => import('./PrivateRoute'));
const VolumePage = React.lazy(() => import('./VolumePage'));
const DashboardPage = React.lazy(() => import('./DashboardPage'));
const AlertPage = React.lazy(() => import('./AlertPage'));

export const NotificationDisplayer = () => {
  const notifications = useTypedSelector(
    (state) => state.app.notifications.list,
  );
  const dispatch = useDispatch();
  const removeNotification = (uid: string) =>
    dispatch(removeNotificationAction(uid));
  return (
    <Notifications
      // @ts-expect-error - FIXME when you are working on it
      notifications={notifications}
      onDismiss={(uid) => removeNotification(uid)}
    />
  );
};

const Layout = () => {
  const intl = useIntl();
  const language = intl.locale;

  const isUserLoaded = useTypedSelector((state) => !!state.oidc?.user);
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(setIntlAction(intl)); // eslint-disable-next-line
  }, [language]);
  const [isSideMenuExpanded, setIsSideMenuExpanded] = useState(
    () =>
      localStorage.getItem('sidebar_expanded') === 'true' ||
      localStorage.getItem('sidebar_expanded') === null,
  );

  const toggleSideMenu = () => {
    setIsSideMenuExpanded(!isSideMenuExpanded);
    localStorage.setItem('sidebar_expanded', String(!isSideMenuExpanded));
  };

  const history = useHistory();
  const location = useLocation();

  const doesRouteMatch = useCallback(
    (paths: RouteProps | RouteProps[]) => {
      const location = history.location;
      if (Array.isArray(paths)) {
        const foundMatchingRoute = paths.find((path) => {
          const demo = matchPath(location.pathname, path);
          return demo;
        });
        return !!foundMatchingRoute;
      } else {
        return !!matchPath(location.pathname, paths);
      }
    },
    [location],
  );

  const routeWithoutSideBars = [
    {
      path: '/alerts',
      exact: true,
      strict: true,
    },
    {
      path: '/nodes/create',
      exact: true,
    },
    {
      path: '/volumes/createVolume',
      exact: true,
    },
    {
      path: '/configure-alerts',
      exact: true,
    },
  ];

  const hideSideBar = doesRouteMatch(routeWithoutSideBars);

  const sidebarConfig = {
    onToggleClick: toggleSideMenu,
    hoverable: true,
    expanded: isSideMenuExpanded,
    'data-cy-state-isexpanded': isSideMenuExpanded,
    actions: [
      {
        label: intl.formatMessage({
          id: 'dashboard',
        }),
        icon: <Icon name="Dashboard" />,
        onClick: () => {
          history.push('/dashboard');
        },
        active: doesRouteMatch({
          path: '/dashboard',
          exact: true,
          strict: true,
        }),
        'data-cy': 'sidebar_item_dashboard',
      },
      {
        label: intl.formatMessage({
          id: 'nodes',
        }),
        icon: <Icon name="Node-backend" />,
        onClick: () => {
          history.push('/nodes');
        },
        active: doesRouteMatch({
          path: '/nodes',
          exact: false,
          strict: true,
        }),
        'data-cy': 'sidebar_item_nodes',
      },
      {
        label: intl.formatMessage({
          id: 'volumes',
        }),
        icon: <Icon name="Node-pdf" />,
        onClick: () => {
          history.push('/volumes');
        },
        active: doesRouteMatch({
          path: '/volumes',
          exact: false,
          strict: true,
        }),
        'data-cy': 'sidebar_item_volumes',
      },
    ],
  };
  return (
    <AppContainer
      hasPadding
      sidebarNavigation={
        isUserLoaded && !hideSideBar ? (
          <Sidebar {...sidebarConfig} />
        ) : undefined
      }
    >
      <NotificationDisplayer />
      <Suspense fallback={<Loader size="massive" centered={true} />}>
        <Switch>
          <PrivateRoute
            exact
            path="/"
            component={() => <Redirect to="/dashboard" />}
          />
          <PrivateRoute exact path="/nodes/create" component={NodeCreateForm} />
          <PrivateRoute
            path={`/nodes/:id/createVolume`}
            component={CreateVolume}
          />
          <PrivateRoute
            exact
            path="/volumes/createVolume"
            component={CreateVolume}
          />
          <PrivateRoute path="/nodes" component={NodePage} />
          <PrivateRoute path="/volumes/:name?" component={VolumePage} />
          <PrivateRoute exact path="/about" component={About} />
          <PrivateRoute exact path="/alerts" component={AlertPage} />
          <PrivateRoute exact path="/dashboard" component={DashboardPage} />
          <PrivateRoute
            exact
            path="/configure-alerts"
            component={ConfigureAlerting}
            canAccess={(_, userAccessRight) => {
              return userAccessRight.canConfigureEmailNotification;
            }}
          />
          <Route
            component={() => (
              <ErrorPage404 data-cy="sc-error-page404" locale={language} />
            )}
          />
        </Switch>
      </Suspense>
    </AppContainer>
  );
};

export default Layout;
