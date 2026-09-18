import { AppContainer, ErrorPage404, ErrorPage500, Icon, Loader, Notifications, Sidebar } from '@scality/core-ui';
import { lazy, useCallback, useEffect, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import { matchPath, Navigate, Route } from 'react-router';
import { Routes, useLocation } from 'react-router-dom';
import { removeNotificationAction } from '../ducks/app/notifications';
import { setIntlAction } from '../ducks/config';
import { useTypedSelector } from '../hooks';

import CreateVolume from './CreateVolume';
import {
  FederatedComponent,
  useBasenameRelativeNavigate,
  useShellAlerts,
  useShellHooks,
} from '@scality/module-federation';
import { useDiscoveredViews } from './ConfigProvider';

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

// Inlined until core-ui ships this icon.
const VirtualMachinesIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 640 640"
    width="1em"
    height="1em"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M544 160L192 160C192 124.7 220.7 96 256 96L544 96C579.3 96 608 124.7 608 160L608 352C608 387.3 579.3 416 544 416L496 416L496 352L544 352L544 160zM32 288C32 252.7 60.7 224 96 224L384 224C419.3 224 448 252.7 448 288L448 480C448 515.3 419.3 544 384 544L96 544C60.7 544 32 515.3 32 480L32 288zM96 328C96 341.3 106.7 352 120 352L360 352C373.3 352 384 341.3 384 328C384 314.7 373.3 304 360 304L120 304C106.7 304 96 314.7 96 328z" />
  </svg>
);

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

  const discoveredViews = useDiscoveredViews();
  const shellHooks = useShellHooks();
  const shellAlerts = useShellAlerts();
  const vmView = discoveredViews.find(
    (view): view is Extract<typeof view, { isFederated: true }> =>
      view.isFederated && view.app.kind === 'vm-management-ui',
  );

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
      ...(vmView
        ? [
            {
              label: intl.formatMessage({
                id: 'virtual_machines',
              }),
              icon: <VirtualMachinesIcon />,
              onClick: () => {
                navigate('/virtual-machines');
              },
              active: doesRouteMatch('/virtual-machines'),
              'data-cy': 'sidebar_item_virtual_machines',
            },
          ]
        : []),
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
        <Route
          path="virtual-machines/*"
          element={
            vmView ? (
              <PrivateRoute>
                <ErrorBoundary FallbackComponent={() => <ErrorPage500 data-cy="sc-error-page500" locale={language} />}>
                  <FederatedComponent
                    url={`${vmView.app.url}/mf-manifest.json`}
                    scope={vmView.view.scope}
                    module={vmView.view.module}
                    app={vmView.app}
                    props={{ shellHooks, shellAlerts }}
                    renderOnLoading={<Loader size="massive" />}
                  />
                </ErrorBoundary>
              </PrivateRoute>
            ) : (
              <ErrorPage404 data-cy="sc-error-page404" locale={language} />
            )
          }
        />
        <Route path="/" element={<Navigate to="dashboard" replace />} />
        <Route path="*" element={<ErrorPage404 data-cy="sc-error-page404" locale={language} />} />
      </Routes>
    </AppContainer>
  );
};

export default Layout;
