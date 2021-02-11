//@flow
import { combineReducers } from 'redux';

import config from './config';
import type { ConfigState } from './config';
import nodes, { NodesState } from './app/nodes';
import pods from './app/pods';
import type { PodsState } from './app/pods';
import volumes from './app/volumes';
import type { VolumesState } from './app/volumes';
import login from './login';
import type { LoginState } from './login';
import layout from './app/layout';
import type { LayoutState } from './app/layout';
import notifications from './app/notifications';
import type { NotificationsState } from './app/notifications';
import salt, { SaltState } from './app/salt';
import monitoring, { MonitoringState } from './app/monitoring';
import solutions, { SolutionsState } from './app/solutions';
import alerts from './app/alerts';
import type { AlertsState } from './app/alerts';
import { oidcReducer, type UserState } from './oidc';

const rootReducer = combineReducers({
  config,
  login,
  app: combineReducers({
    nodes,
    layout,
    pods,
    notifications,
    salt,
    monitoring,
    volumes,
    solutions,
    alerts,
  }),
  oidc: oidcReducer,
});

export type RootState = {
  config: ConfigState,
  login: LoginState,
  oidc?: UserState,
  app: {
    nodes: NodesState,
    pods: PodsState,
    notifications: NotificationsState,
    volumes: VolumesState,
    solutions: SolutionsState,
    layout: LayoutState,
    salt: SaltState,
    monitoring: MonitoringState,
    alerts: AlertsState,
  },
};

export default rootReducer;
