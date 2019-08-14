import React from 'react';
import { connect } from 'react-redux';
import { injectIntl } from 'react-intl';
import { ThemeProvider } from 'styled-components';
import { matchPath } from 'react-router';
import { Layout as CoreUILayout, Notifications } from '@scality/core-ui';
import { withRouter, Switch } from 'react-router-dom';

import NodeCreateForm from './NodeCreateForm';
import NodeList from './NodeList';
import SolutionList from './SolutionList';
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
  stopRefreshSolutionsAction
} from '../ducks/config';

const Layout = props => {
  useRefreshEffect(refreshSolutionsAction, stopRefreshSolutionsAction);

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
        label: props.intl.messages.monitoring,
        icon: <i className="fas fa-desktop" />,
        onClick: () => {
          props.history.push('/');
        },
        active: matchPath(props.history.location.pathname, {
          path: '/',
          exact: true,
          strict: true
        })
      },
      {
        label: props.intl.messages.nodes,
        icon: <i className="fas fa-server" />,
        onClick: () => {
          props.history.push('/nodes');
        },
        active: matchPath(props.history.location.pathname, {
          path: '/nodes',
          exact: false,
          strict: true
        })
      }
    ]
  };

  let applications = null;
  if (props?.solutions?.length) {
    applications = props?.solutions?.reduce((prev, solution) => {
      let solutionDeployedVersions = solution?.versions?.filter(
        version => version?.deployed && version?.ui_url
      );
      let app = solutionDeployedVersions.map(version => ({
        label: solution.name,
        // TO BE IMPROVED in core-ui to allow display Link or <a></a>
        onClick: () => window.open(version.ui_url, '_self')
      }));
      return [...prev, ...app];
    }, []);

    sidebar.actions.push({
      label: props.intl.messages.solutions,
      icon: <i className="fas fa-th" />,
      onClick: () => {
        props.history.push('/solutions');
      },
      active: matchPath(props.history.location.pathname, {
        path: '/solutions',
        exact: false,
        strict: true
      })
    });
  }

  // In this particular case, the label should not be translated
  const languages = [
    {
      label: 'Français',
      name: FR_LANG,
      onClick: () => {
        props.updateLanguage(FR_LANG);
      },
      selected: props.language === FR_LANG,
      'data-cy': FR_LANG
    },
    {
      label: 'English',
      name: EN_LANG,
      onClick: () => {
        props.updateLanguage(EN_LANG);
      },
      selected: props.language === EN_LANG,
      'data-cy': EN_LANG
    }
  ];

  const navbar = {
    onToggleClick: props.toggleSidebar,
    toggleVisible: true,
    productName: props.intl.messages.product_name,
    applications,
    help,
    user: props.user && user,
    languages,
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
          <PrivateRoute exact path="/nodes/create" component={NodeCreateForm} />
          <PrivateRoute
            exact
            path="/nodes/deploy/:id"
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
          <PrivateRoute exact path="/about" component={About} />
          <PrivateRoute exact path="/" component={ClusterMonitoring} />
        </Switch>
      </CoreUILayout>
    </ThemeProvider>
  );
};

const mapStateToProps = state => ({
  user: state.login.user,
  sidebar: state.app.layout.sidebar,
  theme: state.config.theme,
  notifications: state.app.notifications.list,
  language: state.config.language,
  solutions: state.config.solutions
});

const mapDispatchToProps = dispatch => {
  return {
    logout: () => dispatch(logoutAction()),
    removeNotification: uid => dispatch(removeNotificationAction(uid)),
    updateLanguage: language => dispatch(updateLanguageAction(language)),
    toggleSidebar: () => dispatch(toggleSideBarAction())
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
