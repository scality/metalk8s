import { all, call, put, takeEvery, select, delay } from 'redux-saga/effects';
import * as ApiK8s from '../../services/k8s/api';
import history from '../../history';
import { REFRESH_TIMEOUT } from '../../constants';

const APP_K8S_PART_OF_SOLUTION_LABEL = 'app.kubernetes.io/part-of';
const APP_K8S_VERSION_LABEL = 'app.kubernetes.io/version';

// Actions
export const SET_SOLUTIONS = 'SET_SOLUTIONS';
export const SET_SOLUTIONS_REFRESHING = 'SET_SOLUTIONS_REFRESHING';
export const SET_SERVICES = 'SET_SERVICES';
export const SET_ENVIRONMENTS = 'SET_ENVIRONMENTS';
const CREATE_ENVIRONMENT = 'CREATE_ENVIRONMENT';
const REFRESH_SOLUTIONS = 'REFRESH_SOLUTIONS';
const STOP_REFRESH_SOLUTIONS = 'STOP_REFRESH_SOLUTIONS';
const PREPARE_ENVIRONMENT = 'PREPARE_ENVIRONMENT';

// Reducer
const defaultState = {
  solutions: [],
  services: [],
  environments: [],
  isSolutionsRefreshing: false,
};

export default function reducer(state = defaultState, action = {}) {
  switch (action.type) {
    case SET_SOLUTIONS:
      return { ...state, solutions: action.payload };
    case SET_SERVICES:
      return { ...state, services: action.payload };
    case SET_ENVIRONMENTS:
      return { ...state, environments: action.payload };
    case SET_SOLUTIONS_REFRESHING:
      return { ...state, isSolutionsRefreshing: action.payload };
    default:
      return state;
  }
}

// Actions Creator

export function setSolutionsAction(solutions) {
  return { type: SET_SOLUTIONS, payload: solutions };
}

export function setSolutionsRefeshingAction(payload) {
  return { type: SET_SOLUTIONS_REFRESHING, payload };
}

export function setServicesAction(services) {
  return { type: SET_SERVICES, payload: services };
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

export function prepareEnvironmentAction(payload) {
  return { type: PREPARE_ENVIRONMENT, payload };
}

export function* createEnvironment(action) {
  const newEnvironment = action.payload;

  const body = {
    apiVersion: 'solutions.metalk8s.scality.com/v1alpha1',
    kind: 'Environment',
    metadata: {
      name: newEnvironment.name,
    },
    spec: {
      description: newEnvironment.description,
      solutions: [],
    },
  };

  const result = yield call(ApiK8s.createEnvironment, body);
  if (!result.error) {
    yield call(fetchEnvironments);
    history.push('/solutions');
  }
  return result;
}

export function* updateSolutionVersion(environment, solution, version) {
  const environments = yield select(state => state.app.solutions.environments);
  const environmentToUpdate = environments.find(
    item => item.metadata.name === environment,
  );
  if (environmentToUpdate) {
    let solutions = environmentToUpdate.spec.solutions;
    const solutionToUpdate = solutions.find(sol => sol.name === solution);
    if (solutionToUpdate) {
      solutionToUpdate.version = version;
    } else {
      solutions = [...solutions, { name: solution, version }];
    }
    const body = {
      apiVersion: 'solutions.metalk8s.scality.com/v1alpha1',
      kind: 'Environment',
      metadata: {
        name: environment,
      },
      spec: {
        solutions,
      },
    };
    return yield call(ApiK8s.updateEnvironment, body, environment);
  }
}

export function* prepareEnvironment({ payload }) {
  const { environment, version, url, solution } = payload;
  const namespaces = `${environment}-${solution}`;

  const results = yield all([
    yield call(createNamespace, namespaces), //Create Namespace if not exists
    yield call(updateSolutionVersion, environment, solution, version), // Update the desired solution version in the environment
  ]);

  if (!results.find(result => result && result.error)) {
    window.open(url, '_blank');
  }
}

export function* fetchUIServices() {
  const result = yield call(ApiK8s.getUIServiceForAllNamespaces);
  if (!result.error) {
    yield put(setServicesAction(result.body.items));
  }
  return result;
}

export function* fetchSolutions() {
  const result = yield call(ApiK8s.getSolutionsConfigMapForAllNamespaces);
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

export function* fetchEnvironments() {
  const result = yield call(ApiK8s.getEnvironments);
  if (!result.error) {
    yield put(setEnvironmentsAction(result?.body?.items ?? []));
  }
  return result;
}

export function* refreshSolutions() {
  yield put(setSolutionsRefeshingAction(true));

  const resultFetchUIServices = yield call(fetchUIServices);
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

export function* createNamespace(name) {
  const results = yield call(ApiK8s.getNamespaces, name);
  if (results.error) {
    const body = {
      metadata: {
        name: name,
      },
    };
    const result = yield call(ApiK8s.createNamespace, body);
    return result;
  }
  return results;
}

// Sagas
export function* solutionsSaga() {
  yield takeEvery(REFRESH_SOLUTIONS, refreshSolutions);
  yield takeEvery(STOP_REFRESH_SOLUTIONS, stopRefreshSolutions);
  yield takeEvery(CREATE_ENVIRONMENT, createEnvironment);
  yield takeEvery(PREPARE_ENVIRONMENT, prepareEnvironment);
}
