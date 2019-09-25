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
const REFRESH_STACK = 'REFRESH_STACK';
const STOP_REFRESH_STACK = 'STOP_REFRESH_STACK';

const PREPARE_STACK = 'PREPARE_STACK';
const UPGRADE_STACK = 'UPGRADE_STACK';
const UPDATE_STACK = 'UPDATE_STACK';
const ADD_STACK = 'ADD_STACK';
const EDIT_STACK = 'EDIT_STACK';

// Reducer
const defaultState = {
  list: [],
  isRefreshing: false
};

export default function reducer(state = defaultState, action = {}) {
  switch (action.type) {
    case ADD_STACK:
      const list = [...state.list];
      const index = state.list.findIndex(
        item => item.name === action.payload.name
      );
      if (index > -1) {
        list[index] = action.payload;
        return { ...state, list: [...list] };
      }
      return { ...state, list: [...state.list, action.payload] };
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

export const addStackAction = payload => {
  return { type: ADD_STACK, payload };
};

export const editStackAction = payload => {
  return { type: EDIT_STACK, payload };
};

export const prepareStackAction = payload => {
  return { type: PREPARE_STACK, payload };
};

export const upgradeStackAction = payload => {
  return { type: UPGRADE_STACK, payload };
};

// Sagas
export function* fetchStack() {
  const results = yield call(ApiK8s.getStack);
  if (!results.error) {
    yield all(
      results.body.items.map(stack => {
        return call(updateStack, stack);
      })
    );
  }
  return results;
}
export function* updateStack(stack) {
  yield call(
    fetchOpertorDeployments,
    `${stack.metadata.name}-example-solution`
  );
  const operators = yield select(state => state.app.deployments.list);
  yield put(
    addStackAction({
      name: stack.metadata.name,
      status: '',
      description: stack.spec.description,
      version: operators.length ? operators[0].version : '',
      solutions: stack.spec.solutions || []
    })
  );
}
export function* prepareStack({ payload }) {
  yield call(manageStack, payload);
  yield call(history.push, `/stacks/${payload.name}`);
}

export function* upgradeStack({ payload }) {
  yield call(manageStack, payload);
}

export function* manageStack(payload) {
  const { name, version } = payload;

  //Prepare stack if not done yet
  yield call(fetchStack);
  const stacks = yield select(state => state.app.stack.list);
  const stackToPrepare = stacks.find(item => item.name === name);
  // TODO: If the environment is up-to-date
  if (stackToPrepare.version !== version) {
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
      yield call(fetchStack);
    }
  }
}

export function* addOrUpdateSolutionInStack(name, version) {
  yield call(fetchStack);
  const stacks = yield select(state => state.app.stack.list);
  const stackToUpdate = stacks.find(item => item.name === name);

  if (stackToUpdate) {
    let solutions = stackToUpdate.solutions;
    const solutionToUpdate = solutions.find(sol => sol.name === SOLUTION_NAME);
    if (solutionToUpdate) {
      solutionToUpdate.version = version;
    } else {
      solutions = [...solutions, { name: SOLUTION_NAME, version }];
    }
    const body = {
      apiVersion: 'solutions.metalk8s.scality.com/v1alpha1',
      kind: 'Stack',
      metadata: {
        name
      },
      spec: {
        solutions
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
  yield takeEvery(UPGRADE_STACK, upgradeStack);
}
