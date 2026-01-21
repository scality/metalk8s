import { combineReducers } from 'redux';
import type { AuthErrorState } from './app/authError';
import authError from './app/authError';
import monitoring, { type MonitoringState } from './app/monitoring';
import type { NodesState } from './app/nodes';
import nodes from './app/nodes';
import type { NotificationsState } from './app/notifications';
import notifications from './app/notifications';
import type { PodsState } from './app/pods';
import pods from './app/pods';
import salt, { type SaltState } from './app/salt';
import type { VolumesState } from './app/volumes';
import volumes from './app/volumes';
import type { ConfigState } from './config';
import config from './config';
import type { HistoryState } from './history';
import { historyReducer } from './history';
import type { LoginState } from './login';
import login from './login';
import type { UserState } from './oidc';
import { oidcReducer } from './oidc';

const rootReducer = combineReducers({
  config,
  login,
  app: combineReducers({
    nodes,
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
  config: ConfigState;
  login: LoginState;
  oidc?: UserState;
  history: HistoryState<unknown>;
  app: {
    nodes: NodesState;
    pods: PodsState;
    notifications: NotificationsState;
    volumes: VolumesState;
    salt: SaltState;
    monitoring: MonitoringState;
    authError: AuthErrorState;
  };
};
export default rootReducer;
