import React, { Component } from 'react';
import { connect } from 'react-redux';
import { injectIntl } from 'react-intl';
import { ThemeProvider } from 'styled-components';
import { matchPath } from 'react-router';
import { Layout as CoreUILayout, Notifications } from '@scality/core-ui';
import { withRouter, Switch } from 'react-router-dom';

import NodeCreateForm from './NodeCreateForm';
import NodeList from './NodeList';
import NodeInformation from './NodeInformation';
import NodeDeployment from './NodeDeployment';
import ClusterMonitoring from './ClusterMonitoring';
import Welcome from '../components/Welcome';
import PrivateRoute from './PrivateRoute';
import { logoutAction } from '../ducks/login';
import { toggleSideBarAction } from '../ducks/app/layout';

import { removeNotificationAction } from '../ducks/app/notifications';
import { updateLanguageAction } from '../ducks/config';
import { FR_LANG, EN_LANG } from '../constants';

class Layout extends Component {
  render() {
    const applications = [];

    const help = [
      {
        label: this.props.intl.messages.about,
        onClick: () => {
          this.props.history.push('/about');
        }
      }
    ];

    const user = {
      name: this.props.user && this.props.user.username,
      actions: [
        { label: this.props.intl.messages.log_out, onClick: this.props.logout }
      ]
    };

    const sidebar = {
      expanded: this.props.sidebar.expanded,
      actions: [
        {
          label: this.props.intl.messages.cluster_monitoring,
          icon: <i className="fas fa-desktop" />,
          onClick: () => {
            this.props.history.push('/');
          },
          active: matchPath(this.props.history.location.pathname, {
            path: '/',
            exact: true,
            strict: true
          })
        },
        {
          label: this.props.intl.messages.nodes,
          icon: <i className="fas fa-server" />,
          onClick: () => {
            this.props.history.push('/nodes');
          },
          active: matchPath(this.props.history.location.pathname, {
            path: '/nodes',
            exact: false,
            strict: true
          })
        }
      ]
    };

    // In this particular case, the label should not be translated
    const languages = [
      {
        label: 'Français',
        name: FR_LANG,
        onClick: () => {
          this.props.updateLanguage(FR_LANG);
        },
        selected: this.props.language === FR_LANG,
        'data-cy': FR_LANG
      },
      {
        label: 'English',
        name: EN_LANG,
        onClick: () => {
          this.props.updateLanguage(EN_LANG);
        },
        selected: this.props.language === EN_LANG,
        'data-cy': EN_LANG
      }
    ];

    const navbar = {
      onToggleClick: this.props.toggleSidebar,
      toggleVisible: true,
      productName: this.props.intl.messages.product_name,
      applications,
      help,
      user: this.props.user && user,
      languages,
      logo: (
        <img
          alt="logo"
          src={process.env.PUBLIC_URL + '/brand/assets/branding.svg'}
        />
      )
    };

    return (
      <ThemeProvider theme={this.props.theme}>
        <CoreUILayout sidebar={sidebar} navbar={navbar}>
          <Notifications
            notifications={this.props.notifications}
            onDismiss={this.props.removeNotification}
          />
          <Switch>
            <PrivateRoute
              exact
              path="/nodes/create"
              component={NodeCreateForm}
            />
            <PrivateRoute
              exact
              path="/nodes/deploy/:id"
              component={NodeDeployment}
            />
            <PrivateRoute exact path="/nodes/:id" component={NodeInformation} />
            <PrivateRoute exact path="/nodes" component={NodeList} />
            <PrivateRoute exact path="/about" component={Welcome} />
            <PrivateRoute exact path="/" component={ClusterMonitoring} />
          </Switch>
        </CoreUILayout>
      </ThemeProvider>
    );
  }
}

const mapStateToProps = state => ({
  user: state.login.user,
  sidebar: state.app.layout.sidebar,
  theme: state.config.theme,
  notifications: state.app.notifications.list,
  language: state.config.language
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
