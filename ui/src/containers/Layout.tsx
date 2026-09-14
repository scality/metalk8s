import { AppContainer, ErrorPage404, Icon, Notifications, Sidebar } from '@scality/core-ui';
import { lazy, useCallback, useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import { matchPath, Navigate, Route } from 'react-router';
import { Routes, useLocation } from 'react-router-dom';
import { removeNotificationAction } from '../ducks/app/notifications';
import { setIntlAction } from '../ducks/config';
import { useTypedSelector } from '../hooks';

import CreateVolume from './CreateVolume';
import { useBasenameRelativeNavigate } from '@scality/module-federation';

const ConfigureAlerting = lazy(() => import('../alert-configuration/ConfigureAlerting'));
const NodeCreateForm = lazy(() => import('./NodeCreateForm'));
const NodePage = lazy(() => import('./NodePage'));
const About = lazy(() => import('./About'));
const PrivateRoute = lazy(() => import('./PrivateRoute'));
const VolumePage = lazy(() => import('./VolumePage'));
const DashboardPage = lazy(() => import('./DashboardPage'));
const AlertPage = lazy(() => import('./AlertPage'));

export const NotificationDisplayer = () => {
  const notifications = useTypedSelector((state) => state.app.notifications.list);
  const dispatch = useDispatch();
  const removeNotification = (uid: string) => dispatch(removeNotificationAction(uid));
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
    () => localStorage.getItem('sidebar_expanded') === 'true' || localStorage.getItem('sidebar_expanded') === null,
  );

  const toggleSideMenu = () => {
    setIsSideMenuExpanded(!isSideMenuExpanded);
    localStorage.setItem('sidebar_expanded', String(!isSideMenuExpanded));
  };

  const navigate = useBasenameRelativeNavigate();

  const location = useLocation();

  const basename = useTypedSelector((state) => state.config.api?.ui_base_path);
  const doesRouteMatch = useCallback(
    (paths: string | string[]) => {
      if (Array.isArray(paths)) {
        const foundMatchingRoute = paths.find((path) => !!matchPath(basename + path + '*', location.pathname));
        return !!foundMatchingRoute;
      } else {
        return !!matchPath(basename + paths + '*', location.pathname);
      }
    },
    [location.pathname],
  );

  const routeWithoutSideBars = ['/alerts', '/nodes/create', '/volumes/createVolume', '/configure-alerts'];

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
          navigate('/dashboard');
        },
        active: doesRouteMatch('/dashboard'),
        'data-cy': 'sidebar_item_dashboard',
      },
      {
        label: intl.formatMessage({
          id: 'nodes',
        }),
        icon: <Icon name="Node-pdf" />,
        onClick: () => {
          navigate('/nodes');
        },
        active: doesRouteMatch('/nodes'),
        'data-cy': 'sidebar_item_nodes',
      },
      {
        label: intl.formatMessage({
          id: 'volumes',
        }),
        icon: <Icon name="Volume-pdf" />,
        onClick: () => {
          navigate('/volumes');
        },
        active: doesRouteMatch('/volumes'),
        'data-cy': 'sidebar_item_volumes',
      },
    ],
  };
  return (
    <AppContainer
      hasPadding
      sidebarNavigation={isUserLoaded && !hideSideBar ? <Sidebar {...sidebarConfig} /> : undefined}
    >
      <NotificationDisplayer />
      <Routes>
        <Route
          path="nodes/create"
          element={
            <PrivateRoute>
              <NodeCreateForm />
            </PrivateRoute>
          }
        />
        <Route
          path="nodes/:id/createVolume"
          element={
            <PrivateRoute>
              <CreateVolume />
            </PrivateRoute>
          }
        />
        <Route
          path="volumes/createVolume"
          element={
            <PrivateRoute>
              <CreateVolume />
            </PrivateRoute>
          }
        />
        <Route
          path="nodes/*"
          element={
            <PrivateRoute>
              <NodePage />
            </PrivateRoute>
          }
        />
        <Route
          path="volumes/:name?*"
          element={
            <PrivateRoute>
              <VolumePage />
            </PrivateRoute>
          }
        />
        <Route
          path="about"
          element={
            <PrivateRoute>
              <About />
            </PrivateRoute>
          }
        />
        <Route
          path="alerts"
          element={
            <PrivateRoute>
              <AlertPage />
            </PrivateRoute>
          }
        />
        <Route
          path="dashboard"
          element={
            <PrivateRoute>
              <DashboardPage />
            </PrivateRoute>
          }
        />
        <Route
          path="configure-alerts"
          element={
            <PrivateRoute
              path="configure-alerts"
              canAccess={(_, userAccessRight) => {
                return userAccessRight.canConfigureEmailNotification;
              }}
            >
              <ConfigureAlerting />
            </PrivateRoute>
          }
        />
        <Route path="/" element={<Navigate to="dashboard" replace />} />
        <Route path="*" element={<ErrorPage404 data-cy="sc-error-page404" locale={language} />} />
      </Routes>
    </AppContainer>
  );
};

export default Layout;
