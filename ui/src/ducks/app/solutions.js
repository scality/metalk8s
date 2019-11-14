import { call, put, takeEvery, select, delay } from 'redux-saga/effects';
import * as SolutionsApi from '../../services/k8s/solutions';
import history from '../../history';
import { REFRESH_TIMEOUT } from '../../constants';

const APP_K8S_PART_OF_SOLUTION_LABEL = 'app.kubernetes.io/part-of';
const APP_K8S_VERSION_LABEL = 'app.kubernetes.io/version';

// Actions
export const SET_SOLUTIONS = 'SET_SOLUTIONS';
export const SET_SOLUTIONS_REFRESHING = 'SET_SOLUTIONS_REFRESHING';
export const SET_ENVIRONMENTS = 'SET_ENVIRONMENTS';
const CREATE_ENVIRONMENT = 'CREATE_ENVIRONMENT';
const REFRESH_SOLUTIONS = 'REFRESH_SOLUTIONS';
const STOP_REFRESH_SOLUTIONS = 'STOP_REFRESH_SOLUTIONS';

// Reducer
const defaultState = {
  solutions: [],
  environments: [],
  isSolutionsRefreshing: false,
};

export default function reducer(state = defaultState, action = {}) {
  switch (action.type) {
    case SET_SOLUTIONS:
      return { ...state, solutions: action.payload };
    case SET_ENVIRONMENTS:
      return { ...state, environments: action.payload };
    case SET_SOLUTIONS_REFRESHING:
      return { ...state, isSolutionsRefreshing: action.payload };
    default:
      return state;
  }
}

// Action Creators

export function setSolutionsAction(solutions) {
  return { type: SET_SOLUTIONS, payload: solutions };
}

export function setSolutionsRefeshingAction(payload) {
  return { type: SET_SOLUTIONS_REFRESHING, payload };
}

export const setEnvironmentsAction = environments => {
  return { type: SET_ENVIRONMENTS, payload: environments };
};

export const refreshSolutionsAction = () => {
  return { type: REFRESH_SOLUTIONS };
};

export const stopRefreshSolutionsAction = () => {
  return { type: STOP_REFRESH_SOLUTIONS };
};

export function createEnvironmentAction(newEnvironment) {
  return { type: CREATE_ENVIRONMENT, payload: newEnvironment };
}

// Sagas
export function* fetchEnvironments() {
  const result = yield call(SolutionsApi.listEnvironments);
  if (!result.error) {
    yield put(setEnvironmentsAction(result));
  }
  return result;
}

export function* createEnvironment(action) {
  const result = yield call(SolutionsApi.createEnvironment, action.payload);
  if (!result.error) {
    yield call(fetchEnvironments);
    history.push('/solutions');
  }
  return result;
}

export function* fetchSolutions() {
  const result = yield call(SolutionsApi.getSolutionsConfigMapForAllNamespaces);
  if (!result.error) {
    const solutionsConfigMap = result.body.items[0];
    if (solutionsConfigMap && solutionsConfigMap.data) {
      const solutions = Object.keys(solutionsConfigMap.data).map(key => {
        return {
          name: key,
          versions: JSON.parse(solutionsConfigMap.data[key]),
        };
      });
      const services = yield select(state => state.app.solutions.services);
      solutions.forEach(sol => {
        sol.versions.forEach(version => {
          if (version.deployed) {
            const sol_service = services.find(
              service =>
                service.metadata.labels &&
                service.metadata.labels[APP_K8S_PART_OF_SOLUTION_LABEL] ===
                  sol.name &&
                service.metadata.labels[APP_K8S_VERSION_LABEL] ===
                  version.version,
            );
            version.ui_url = sol_service
              ? `http://localhost:${sol_service.spec.ports[0].nodePort}` // TO BE IMPROVED: we can not get the Solution UI's IP so far
              : '';
          }
        });
      });
      yield put(setSolutionsAction(solutions));
    }
  }
  return result;
}

export function* refreshSolutions() {
  yield put(setSolutionsRefeshingAction(true));

  const resultFetchSolutions = yield call(fetchSolutions);
  const resultFetchEnvironments = yield call(fetchEnvironments);

  if (
    !resultFetchSolutions.error &&
    !resultFetchUIServices.error &&
    !resultFetchEnvironments.error
  ) {
    yield delay(REFRESH_TIMEOUT);
    const isRefreshing = yield select(
      state => state.config.isSolutionsRefreshing,
    );
    if (isRefreshing) {
      yield call(refreshSolutions);
    }
  }
}

export function* stopRefreshSolutions() {
  yield put(setSolutionsRefeshingAction(false));
}

// Sagas
export function* solutionsSaga() {
  yield takeEvery(REFRESH_SOLUTIONS, refreshSolutions);
  yield takeEvery(STOP_REFRESH_SOLUTIONS, stopRefreshSolutions);
  yield takeEvery(CREATE_ENVIRONMENT, createEnvironment);
}
