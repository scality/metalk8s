//@flow
import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { ThemeProvider } from 'styled-components';
import { useRouteMatch, useHistory } from 'react-router';
import { Switch } from 'react-router-dom';
import { Layout as CoreUILayout, Notifications } from '@scality/core-ui';

import { intl } from '../translations/IntlGlobalProvider';
import NodeCreateForm from './NodeCreateForm';
import NodePage from './NodePage';
import SolutionList from './SolutionList';
import EnvironmentCreationForm from './EnvironmentCreationForm';
import NodeDeployment from './NodeDeployment';
import ClusterMonitoring from './ClusterMonitoring';
import About from './About';
import PrivateRoute from './PrivateRoute';
import SolutionDetail from './SolutionDetail';
import VolumePage from './VolumePage';
import DashboardPage from './DashboardPage';

import { toggleSideBarAction } from '../ducks/app/layout';

import { removeNotificationAction } from '../ducks/app/notifications';
import { updateLanguageAction, logoutAction } from '../ducks/config';
import { FR_LANG, EN_LANG } from '../constants';
import CreateVolume from './CreateVolume';
import { fetchClusterVersionAction } from '../ducks/app/nodes';
import { useTypedSelector } from '../hooks';

const Layout = () => {
  const user = useTypedSelector((state) => state.oidc.user);
  const sidebar = useTypedSelector((state) => state.app.layout.sidebar);
  const { theme, language } = useTypedSelector((state) => state.config);
  const notifications = useTypedSelector(
    (state) => state.app.notifications.list,
  );
  const solutions = useTypedSelector((state) => state.app.solutions.solutions);
  const isUserLoaded = useTypedSelector((state) => !!state.oidc.user);
  const api = useTypedSelector((state) => state.config.api);
  const dispatch = useDispatch();

  const logout = (event) => {
    event.preventDefault();
    dispatch(logoutAction());
  };

  const removeNotification = (uid) => dispatch(removeNotificationAction(uid));
  const updateLanguage = (language) => dispatch(updateLanguageAction(language));
  const toggleSidebar = () => dispatch(toggleSideBarAction());
  const history = useHistory();

  useEffect(() => {
    dispatch(fetchClusterVersionAction());
  }, [dispatch]);

  const sidebarConfig = {
    onToggleClick: toggleSidebar,
    hoverable: true,
    expanded: sidebar.expanded,
    'data-cy-state-isexpanded': sidebar.expanded,
    actions: [
      {
        label: intl.translate('dashboard'),
        icon: <i className="fas fa-desktop" />,
        onClick: () => {
          history.push('/dashboard');
        },
        active: useRouteMatch({
          path: '/dashboard',
          exact: true,
          strict: true,
        }),
        'data-cy': 'sidebar_item_dashboard',
      },
      // TODO: Will move to the global navbar
      {
        label: intl.translate('alerts'),
        icon: <i className="fas fa-bell" />,
        onClick: () => {
          history.push('/');
        },
        active: useRouteMatch({
          path: '/',
          exact: true,
          strict: true,
        }),
        'data-cy': 'sidebar_item_alerts',
      },
      {
        label: intl.translate('nodes'),
        icon: <i className="fas fa-server" />,
        onClick: () => {
          history.push('/nodes');
        },
        active: useRouteMatch({
          path: '/nodes',
          exact: false,
          strict: true,
        }),
        'data-cy': 'sidebar_item_nodes',
      },
      {
        label: intl.translate('volumes'),
        icon: <i className="fas fa-database" />,
        onClick: () => {
          history.push('/volumes');
        },
        active: useRouteMatch({
          path: '/volumes',
          exact: false,
          strict: true,
        }),
        'data-cy': 'sidebar_item_volumes',
      },
      {
        label: intl.translate('environments'),
        icon: <i className="fas fa-th" />,
        onClick: () => {
          history.push('/environments');
        },
        active: useRouteMatch({
          path: '/environments',
          exact: false,
          strict: true,
        }),
        'data-cy': 'sidebar_item_environments',
      },
    ],
  };
  // Remove the access to dashboard page if no flags property in the config.json,
  // or no `dashboard` specified in the values.
  if (
    (api && !Object.prototype.hasOwnProperty.call(api, 'flags')) ||
    (api && api.flags && !api.flags.includes('dashboard'))
  ) {
    sidebarConfig.actions.shift();
  }

  let applications = null;
  if (solutions?.length) {
    applications = solutions.reduce((prev, solution) => {
      let solutionDeployedVersions = solution.versions.filter(
        (version) => version?.deployed && version?.ui_url,
      );
      let app = solutionDeployedVersions.map((version) => ({
        label: solution.name,
        // TO BE IMPROVED in core-ui to allow display Link or <a></a>
        onClick: () => window.open(version.ui_url, '_self'),
      }));
      return [...prev, ...app];
    }, []);
  }

  // In this particular case, the label should not be translated
  const languages = [
    {
      label: 'Français',
      name: FR_LANG,
      onClick: () => {
        updateLanguage(FR_LANG);
      },
      selected: language === FR_LANG,
      'data-cy': FR_LANG,
    },
    {
      label: 'English',
      name: EN_LANG,
      onClick: () => {
        updateLanguage(EN_LANG);
      },
      selected: language === EN_LANG,
      'data-cy': EN_LANG,
    },
  ];

  const filterLanguage = languages.filter((lang) => lang.name !== language);

  const rightActions = [
    {
      type: 'dropdown',
      text: language,
      icon: <i className="fas fa-globe" />,
      items: filterLanguage,
    },
    {
      type: 'dropdown',
      icon: <i className="fas fa-question-circle" />,
      items: [
        {
          label: intl.translate('about'),
          onClick: () => {
            history.push('/about');
          },
        },
        {
          label: intl.translate('documentation'),
          onClick: () => {
            api && api.url_doc && window.open(`${api.url_doc}/index.html`);
          },
          'data-cy': 'documentation',
        },
      ],
    },
    {
      type: 'dropdown',
      text: user?.profile?.name,
      icon: <i className="fas fa-user" />,
      'data-cy': 'user_dropdown',
      items: [
        {
          label: intl.translate('log_out'),
          onClick: (event) => logout(event),
          'data-cy': 'logout_button',
        },
      ],
    },
  ];

  const applicationsAction = {
    type: 'dropdown',
    icon: <i className="fas fa-th" />,
    items: applications,
  };

  if (applications && applications.length) {
    rightActions.splice(1, 0, applicationsAction);
  }

  const navbar = {
    productName: intl.translate('product_name'),
    logo: <img alt="logo" src={process.env.PUBLIC_URL + theme.logo_path} />,
    rightActions: [],
  };
  // display the sidebar and rightAction if the user is loaded
  if (isUserLoaded) {
    navbar['rightActions'] = rightActions;
  }

  return (
    <ThemeProvider theme={theme}>
      <CoreUILayout sidebar={isUserLoaded && sidebarConfig} navbar={navbar}>
        <Notifications
          notifications={notifications}
          onDismiss={removeNotification}
        />
        <Switch>
          <PrivateRoute exact path="/nodes/create" component={NodeCreateForm} />
          <PrivateRoute
            exact
            path="/nodes/:id/deploy"
            component={NodeDeployment}
          />
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
          <PrivateRoute exact path="/environments" component={SolutionList} />
          <PrivateRoute path="/volumes/:name?" component={VolumePage} />
          <PrivateRoute
            exact
            path="/environments/create-environment"
            component={EnvironmentCreationForm}
          />
          <PrivateRoute exact path="/about" component={About} />

          {api && api.flags && api.flags.includes('dashboard') && (
            <PrivateRoute exact path="/dashboard" component={DashboardPage} />
          )}
          <PrivateRoute exact path="/" component={ClusterMonitoring} />
          <PrivateRoute
            exact
            path="/environments/:id"
            component={SolutionDetail}
          />
        </Switch>
      </CoreUILayout>
    </ThemeProvider>
  );
};

export default Layout;
