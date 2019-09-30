import { all, call, put, takeEvery, select, delay } from 'redux-saga/effects';
import * as ApiK8s from '../../services/k8s/api';
import history from '../../history';
import { REFRESH_TIMEOUT } from '../../constants';
import { createNamespaces } from './namespaces';
import {
  SOLUTION_NAME,
  createNamespacedServiceAccount,
  createNamespacedRole,
  createNamespacedRoleBinding,
  createOrUpdateOperatorDeployment,
  fetchOpertorDeployments
} from './deployment';

// Actions
const REFRESH_ENVIRONMENT = 'REFRESH_ENVIRONMENT';
const STOP_REFRESH_ENVIRONMENT = 'STOP_REFRESH_ENVIRONMENT';

const PREPARE_ENVIRONMENT = 'PREPARE_ENVIRONMENT';
const UPGRADE_ENVIRONMENT = 'UPGRADE_ENVIRONMENT';
const UPDATE_ENVIRONMENT = 'UPDATE_ENVIRONMENT';
const ADD_ENVIRONMENT = 'ADD_ENVIRONMENT';
const EDIT_ENVIRONMENT = 'EDIT_ENVIRONMENT';

// Reducer
const defaultState = {
  list: [],
  isRefreshing: false
};

export default function reducer(state = defaultState, action = {}) {
  switch (action.type) {
    case ADD_ENVIRONMENT:
      const list = [...state.list];
      const index = state.list.findIndex(
        item => item.name === action.payload.name
      );
      if (index > -1) {
        list[index] = action.payload;
        return { ...state, list: [...list] };
      }
      return { ...state, list: [...state.list, action.payload] };
    case UPDATE_ENVIRONMENT:
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

// Action Creators
export const refreshEnvironmentAction = () => {
  return { type: REFRESH_ENVIRONMENT };
};

export const stopRefreshEnvironmentAction = () => {
  return { type: STOP_REFRESH_ENVIRONMENT };
};

export const updateEnvironmentAction = payload => {
  return { type: UPDATE_ENVIRONMENT, payload };
};

export const addEnvironmentAction = payload => {
  return { type: ADD_ENVIRONMENT, payload };
};

export const editEnvironmentAction = payload => {
  return { type: EDIT_ENVIRONMENT, payload };
};

export const prepareEnvironmentAction = payload => {
  return { type: PREPARE_ENVIRONMENT, payload };
};

export const upgradeEnvironmentAction = payload => {
  return { type: UPGRADE_ENVIRONMENT, payload };
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
  yield call(
    fetchOpertorDeployments,
    `${environment.metadata.name}-example-solution`
  );
  const operators = yield select(state => state.app.deployments.list);
  yield put(
    addEnvironmentAction({
      name: environment.metadata.name,
      status: '',
      description: environment.spec.description,
      version: operators.length ? operators[0].version : '',
      solutions: environment.spec.solutions || []
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
    const namespaces = `${name}-example-solution`;

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
  yield takeEvery(REFRESH_ENVIRONMENT, refreshEnvironment);
  yield takeEvery(STOP_REFRESH_ENVIRONMENT, stopRefreshEnvironment);
  yield takeEvery(PREPARE_ENVIRONMENT, prepareEnvironment);
  yield takeEvery(UPGRADE_ENVIRONMENT, upgradeEnvironment);
}
