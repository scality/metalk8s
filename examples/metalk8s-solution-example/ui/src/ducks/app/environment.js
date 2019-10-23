import { all, call, put, takeEvery, select, delay } from 'redux-saga/effects';
import * as ApiK8s from '../../services/k8s/api';
import history from '../../history';
import { REFRESH_TIMEOUT } from '../../constants';
import { createNamespaces } from './namespaces';
import {
  createNamespacedServiceAccount,
  createNamespacedRole,
  createNamespacedRoleBinding,
  createOrUpdateOperatorDeployment,
  fetchOperatorDeployment
} from './deployment';
import { LABEL_VERSION, SOLUTION_NAME } from '../../constants';

import clockServerReducer, {
  ADD as ADD_CLOCK_SERVER,
  UPDATE as UPDATE_CLOCK_SERVER
} from './clockServer.js';

import versionServerReducer, {
  ADD as ADD_VERSION_SERVER,
  UPDATE as UPDATE_VERSION_SERVER
} from './versionServer.js';

// Actions
const REFRESH = 'REFRESH_ENVIRONMENT';
const STOP_REFRESH = 'STOP_REFRESH_ENVIRONMENT';

const PREPARE = 'PREPARE_ENVIRONMENT';
const UPGRADE = 'UPGRADE_ENVIRONMENT';
const UPDATE = 'UPDATE_ENVIRONMENT';
const ADD = 'ADD_ENVIRONMENT';
const EDIT = 'EDIT_ENVIRONMENT';

// Reducer
const defaultState = {
  list: [],
  isRefreshing: false
};

export default function reducer(state = defaultState, action = {}) {
  switch (action.type) {
    case ADD:
      const list = [...state.list];
      const index = state.list.findIndex(
        item => item.name === action.payload.name
      );
      if (index > -1) {
        list[index] = { ...list[index], ...action.payload };
        return { ...state, list: [...list] };
      }
      return { ...state, list: [...state.list, action.payload] };
    case UPDATE:
      return { ...state, ...action.payload };
    case UPDATE_CLOCK_SERVER:
    case ADD_CLOCK_SERVER:
      return clockServerReducer(state, action);
    case ADD_VERSION_SERVER:
    case UPDATE_VERSION_SERVER:
      return versionServerReducer(state, action);
    default:
      return state;
  }
}

// Action Creators
export const refreshEnvironmentAction = () => {
  return { type: REFRESH };
};

export const stopRefreshEnvironmentAction = () => {
  return { type: STOP_REFRESH };
};

export const updateEnvironmentAction = payload => {
  return { type: UPDATE, payload };
};

export const addEnvironmentAction = payload => {
  return { type: ADD, payload };
};

export const editEnvironmentAction = payload => {
  return { type: EDIT, payload };
};

export const prepareEnvironmentAction = payload => {
  return { type: PREPARE, payload };
};

export const upgradeEnvironmentAction = payload => {
  return { type: UPGRADE, payload };
};

// Sagas
export function* fetchEnvironment() {
  const results = yield call(ApiK8s.getEnvironment);
  if (!results.error) {
    yield all(
      results.body.items.map(environment => {
        return call(updateEnvironment, environment);
      })
    );
  }
  return results;
}
export function* updateEnvironment(environment) {
  const results = yield call(
    fetchOperatorDeployment,
    `${environment.metadata.name}-${SOLUTION_NAME}`
  );
  // One operator per environment
  const operator = results.body || null;
  yield put(
    addEnvironmentAction({
      name: environment.metadata.name,
      status: '', //TO be implemented
      description: environment.spec.description,
      version:
        operator && operator.metadata.labels
          ? operator.metadata.labels[LABEL_VERSION]
          : '',
      solutions: environment.spec.solutions || [],
      operator: operator
        ? {
            name: operator.metadata.name,
            namespace: operator.metadata.namespace,
            image: operator.spec.template.spec.containers['0'].image,
            version:
              (operator.metadata.labels &&
                operator.metadata.labels[LABEL_VERSION]) ||
              ''
          }
        : null
    })
  );
}
export function* prepareEnvironment({ payload }) {
  yield call(manageEnvironment, payload);
  yield delay(1000);
  yield call(history.push, `/environments/${payload.name}`);
}

export function* upgradeEnvironment({ payload }) {
  yield call(manageEnvironment, payload);
}

export function* manageEnvironment(payload) {
  const { name, version } = payload;

  //Prepare environment if not done yet
  yield call(fetchEnvironment);
  const environments = yield select(state => state.app.environment.list);
  const environmentToPrepare = environments.find(item => item.name === name);
  // TODO: If the environment is up-to-date
  if (environmentToPrepare.version !== version) {
    const namespaces = `${name}-${SOLUTION_NAME}`;

    //Create Namespace if not exists
    const resultsCreateNamespaces = yield call(createNamespaces, namespaces);

    //Create ServiceAccount, Role, et RoleBinding for Operator if not exist
    const resultsRBAC = yield all([
      yield call(createNamespacedServiceAccount, namespaces),
      yield call(createNamespacedRole, namespaces),
      yield call(createNamespacedRoleBinding, namespaces)
    ]);

    // Create or upgrade Operator
    const resultsOperatorDeployments = yield call(
      createOrUpdateOperatorDeployment,
      namespaces,
      name,
      version
    );

    // Update Solution of Environment
    if (
      !resultsCreateNamespaces.error &&
      !resultsOperatorDeployments.error &&
      !resultsRBAC.find(result => result.error)
    ) {
      yield call(addOrUpdateSolutionInEnvironment, name, version);
      yield call(fetchEnvironment);
    }
  }
}

export function* addOrUpdateSolutionInEnvironment(name, version) {
  yield call(fetchEnvironment);
  const environments = yield select(state => state.app.environment.list);
  const environmentToUpdate = environments.find(item => item.name === name);

  if (environmentToUpdate) {
    let solutions = environmentToUpdate.solutions;
    const solutionToUpdate = solutions.find(sol => sol.name === SOLUTION_NAME);
    if (solutionToUpdate) {
      solutionToUpdate.version = version;
    } else {
      solutions = [...solutions, { name: SOLUTION_NAME, version }];
    }
    const body = {
      apiVersion: 'solutions.metalk8s.scality.com/v1alpha1',
      kind: 'Environment',
      metadata: {
        name
      },
      spec: {
        solutions
      }
    };
    yield call(ApiK8s.updateEnvironment, body, name);
  }
}

export function* refreshEnvironment() {
  yield put(
    updateEnvironmentAction({
      isRefreshing: true
    })
  );
  const results = yield call(fetchEnvironment);
  if (!results.error) {
    yield delay(REFRESH_TIMEOUT);
    const isRefreshing = yield select(
      state => state.app.environment.isRefreshing
    );
    if (isRefreshing) {
      yield call(refreshEnvironment);
    }
  }
}

export function* stopRefreshEnvironment() {
  yield put(
    updateEnvironmentAction({
      isRefreshing: false
    })
  );
}

export function* environmentSaga() {
  yield takeEvery(REFRESH, refreshEnvironment);
  yield takeEvery(STOP_REFRESH, stopRefreshEnvironment);
  yield takeEvery(PREPARE, prepareEnvironment);
  yield takeEvery(UPGRADE, upgradeEnvironment);
}
