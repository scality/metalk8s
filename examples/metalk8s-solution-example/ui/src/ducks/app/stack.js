import { all, call, put, takeEvery, select, delay } from 'redux-saga/effects';
import * as ApiK8s from '../../services/k8s/api';

import { REFRESH_TIMEOUT } from '../../constants';
import { createNamespaces } from './namespaces';
import {
  SOLUTION_NAME,
  createNamespacedServiceAccount,
  createNamespacedRole,
  createNamespacedRoleBinding,
  createOrUpdateOperatorDeployment
} from './deployment';

// Actions
const REFRESH_STACK = 'REFRESH_STACK';
const STOP_REFRESH_STACK = 'STOP_REFRESH_STACK';

const PREPARE_STACK = 'PREPARE_STACK';
const UPDATE_STACK = 'UPDATE_STACK';
const EDIT_STACK = 'EDIT_STACK';

// Reducer
const defaultState = {
  list: [],
  isRefreshing: false
};

export default function reducer(state = defaultState, action = {}) {
  switch (action.type) {
    case UPDATE_STACK:
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

// Action Creators
export const refreshStackAction = () => {
  return { type: REFRESH_STACK };
};

export const stopRefreshStackAction = () => {
  return { type: STOP_REFRESH_STACK };
};

export const updateStackAction = payload => {
  return { type: UPDATE_STACK, payload };
};

export const editStackAction = payload => {
  return { type: EDIT_STACK, payload };
};

export const prepareStackAction = payload => {
  return { type: PREPARE_STACK, payload };
};

// Sagas
export function* fetchStack() {
  const results = yield call(ApiK8s.getStack);
  if (!results.error) {
    yield put(
      updateStackAction({
        list: results.body.items.map(stack => {
          return {
            name: stack.metadata.name,
            status: 'Ready',
            description: stack.spec.description,
            version: '0.0.1',
            solutions: stack.spec.solutions || []
          };
        })
      })
    );
  }
  return results;
}

export function* prepareStack({ payload }) {
  const { name, version } = payload;
  if (name && version) {
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

    // Update Solution of Stack
    if (
      !resultsCreateNamespaces.error &&
      !resultsOperatorDeployments.error &&
      !resultsRBAC.find(result => result.error)
    ) {
      yield call(addOrUpdateSolutionInStack, name, version);
    }
  }
}

export function* addOrUpdateSolutionInStack(name, version) {
  yield call(fetchStack);
  const stacks = yield select(state => state.app.stack.list);
  const stackToUpdate = stacks.find(item => item.name === name);
  if (stackToUpdate) {
    const body = {
      apiVersion: 'solutions.metalk8s.scality.com/v1alpha1',
      kind: 'Stack',
      metadata: {
        name
      },
      spec: {
        solutions: [
          ...stackToUpdate.solutions,
          { name: SOLUTION_NAME, version }
        ]
      }
    };
    yield call(ApiK8s.updateStack, body, name);
  }
}

export function* refreshStack() {
  yield put(
    updateStackAction({
      isRefreshing: true
    })
  );
  const results = yield call(fetchStack);
  if (!results.error) {
    yield delay(REFRESH_TIMEOUT);
    const isRefreshing = yield select(state => state.app.stack.isRefreshing);
    if (isRefreshing) {
      yield call(refreshStack);
    }
  }
}

export function* stopRefreshStack() {
  yield put(
    updateStackAction({
      isRefreshing: false
    })
  );
}

export function* stackSaga() {
  yield takeEvery(REFRESH_STACK, refreshStack);
  yield takeEvery(STOP_REFRESH_STACK, stopRefreshStack);
  yield takeEvery(PREPARE_STACK, prepareStack);
}
