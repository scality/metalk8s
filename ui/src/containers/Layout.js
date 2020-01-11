import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { injectIntl } from 'react-intl';
import { ThemeProvider } from 'styled-components';
import { useRouteMatch, useHistory } from 'react-router';
import { Layout as CoreUILayout, Notifications } from '@scality/core-ui';
import { Switch } from 'react-router-dom';

import NodeCreateForm from './NodeCreateForm';
import NodeList from './NodeList';
import SolutionList from './SolutionList';
import EnvironmentCreationForm from './EnvironmentCreationForm';
import NodeInformation from './NodeInformation';
import NodeDeployment from './NodeDeployment';
import ClusterMonitoring from './ClusterMonitoring';
import About from './About';
import PrivateRoute from './PrivateRoute';
import { logoutAction } from '../ducks/login';
import { toggleSideBarAction } from '../ducks/app/layout';

import { removeNotificationAction } from '../ducks/app/notifications';
import { updateLanguageAction } from '../ducks/config';
import { FR_LANG, EN_LANG } from '../constants';
import CreateVolume from './CreateVolume';
import VolumeInformation from './VolumeInformation';
import { useRefreshEffect } from '../services/utils';
import {
  refreshSolutionsAction,
  stopRefreshSolutionsAction,
} from '../ducks/app/solutions';
import { fetchClusterVersionAction } from '../ducks/app/nodes';

const Layout = props => {
  const user = useSelector(state => state.login.user);
  const sidebar = useSelector(state => state.app.layout.sidebar);
  const theme = useSelector(state => state.config.theme);
  const logoPath = useSelector(state => state.config.logoPath);
  const notifications = useSelector(state => state.app.notifications.list);
  const language = useSelector(state => state.config.language);
  const solutions = useSelector(state => state.app.solutions.solutions);
  const dispatch = useDispatch();
  const logout = () => dispatch(logoutAction());
  const removeNotification = uid => dispatch(removeNotificationAction(uid));
  const updateLanguage = language => dispatch(updateLanguageAction(language));
  const toggleSidebar = () => dispatch(toggleSideBarAction());
  const { intl } = props;
  const history = useHistory();
  const api = useSelector(state => state.config.api);
  useRefreshEffect(refreshSolutionsAction, stopRefreshSolutionsAction);
  useEffect(() => {
    dispatch(fetchClusterVersionAction());
  }, [dispatch]);

  const help = [
    {
      label: intl.messages.about,
      onClick: () => {
        history.push('/about');
      },
    },
    {
      label: intl.messages.documentation,
      onClick: () => {
        window.open(`${api.url_doc}/index.html`);
      },
      'data-cy': 'documentation',
    },
  ];

  const userConfig = {
    name: user && user.username,
    actions: [{ label: intl.messages.log_out, onClick: logout }],
  };

  const sidebarConfig = {
    expanded: sidebar.expanded,
    actions: [
      {
        label: intl.messages.monitoring,
        icon: <i className="fas fa-desktop" />,
        onClick: () => {
          history.push('/');
        },
        active: useRouteMatch({
          path: '/',
          exact: true,
          strict: true,
        }),
      },
      {
        label: intl.messages.nodes,
        icon: <i className="fas fa-server" />,
        onClick: () => {
          history.push('/nodes');
        },
        active: useRouteMatch({
          path: '/nodes',
          exact: false,
          strict: true,
        }),
      },
      {
        label: intl.messages.solutions,
        icon: <i className="fas fa-th" />,
        onClick: () => {
          history.push('/solutions');
        },
        active: useRouteMatch({
          path: '/solutions',
          exact: false,
          strict: true,
        }),
      },
    ],
  };

  let applications = null;
  if (solutions?.length) {
    applications = solutions?.reduce((prev, solution) => {
      let solutionDeployedVersions = solution?.versions?.filter(
        version => version?.deployed && version?.ui_url,
      );
      let app = solutionDeployedVersions.map(version => ({
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

  const navbar = {
    onToggleClick: toggleSidebar,
    toggleVisible: true,
    productName: intl.messages.product_name,
    applications,
    help,
    user: user && userConfig,
    languages,
    logo: <img alt="logo" src={process.env.PUBLIC_URL + theme.logo_path} />,
  };

  return (
    <ThemeProvider theme={theme}>
      <CoreUILayout sidebar={sidebarConfig} navbar={navbar}>
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
            path="/nodes/:id/volumes/:volumeName"
            component={VolumeInformation}
          />
          <PrivateRoute path="/nodes/:id" component={NodeInformation} />
          <PrivateRoute exact path="/nodes" component={NodeList} />
          <PrivateRoute exact path="/solutions" component={SolutionList} />
          <PrivateRoute
            exact
            path="/solutions/create-environment"
            component={EnvironmentCreationForm}
          />
          <PrivateRoute exact path="/about" component={About} />
          <PrivateRoute exact path="/" component={ClusterMonitoring} />
        </Switch>
      </CoreUILayout>
    </ThemeProvider>
  );
};

export default injectIntl(Layout);
