//@flow
import { combineReducers } from 'redux';

import config from './config';
import type { ConfigState } from './config';
import nodes from './app/nodes';
import type { NodesState } from './app/nodes';
import pods from './app/pods';
import type { PodsState } from './app/pods';
import volumes from './app/volumes';
import type { VolumesState } from './app/volumes';
import authError from './app/authError';
import type { AuthErrorState } from './app/authError';
import login from './login';
import type { LoginState } from './login';
import layout from './app/layout';
import type { LayoutState } from './app/layout';
import notifications from './app/notifications';
import type { NotificationsState } from './app/notifications';
import salt, { SaltState } from './app/salt';
import monitoring, { MonitoringState } from './app/monitoring';
import { oidcReducer, type UserState } from './oidc';
import { historyReducer, type HistoryState } from './history';

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
    authError,
  }),
  oidc: oidcReducer,
  history: historyReducer,
});

export type RootState = {
  config: ConfigState,
  login: LoginState,
  oidc?: UserState,
  history: HistoryState,
  app: {
    nodes: NodesState,
    pods: PodsState,
    notifications: NotificationsState,
    volumes: VolumesState,
    layout: LayoutState,
    salt: SaltState,
    monitoring: MonitoringState,
    authError: AuthErrorState,
  },
};

export default rootReducer;
