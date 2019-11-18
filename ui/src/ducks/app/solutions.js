import {
  all,
  call,
  delay,
  fork,
  put,
  race,
  select,
  take,
  takeEvery,
} from 'redux-saga/effects';
import * as SaltApi from '../../services/salt/api';
import * as SolutionsApi from '../../services/k8s/solutions';
import history from '../../history';
import { REFRESH_TIMEOUT } from '../../constants';
import { intl } from '../../translations/IntlGlobalProvider';
import { addJobAction, JOB_COMPLETED } from './salt';
import {
  addNotificationErrorAction,
  addNotificationSuccessAction,
} from './notifications';

// Actions
export const SET_SOLUTIONS = 'SET_SOLUTIONS';
export const SET_SOLUTIONS_REFRESHING = 'SET_SOLUTIONS_REFRESHING';
export const SET_ENVIRONMENTS = 'SET_ENVIRONMENTS';
const CREATE_ENVIRONMENT = 'CREATE_ENVIRONMENT';
const PREPARE_ENVIRONMENT = 'PREPARE_ENVIRONMENT';
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

export function prepareEnvironmentAction(environment) {
  return { type: PREPARE_ENVIRONMENT, payload: { environment } };
}

// Sagas
export function* fetchEnvironments() {
  const jobs = yield select(state => state.app.salt.jobs);
  const preparingEnvs = jobs
    .filter(job => job.name.startsWith('prepare-env/') && !job.complete)
    .map(job => job.name.replace(/^(prepare-env\/)/, ''));

  const result = yield call(SolutionsApi.listEnvironments);
  if (!result.error) {
    const environmentsInfo = yield all(
      result.reduce((environments, env) => {
        return {
          ...environments,
          [env.name]: {
            adminUIs: call(SolutionsApi.getEnvironmentAdminUIs, env),
            config: call(SolutionsApi.getEnvironmentConfigMap, env),
          },
        };
      }),
      {},
    );

    const detailedEnvironments = result.map(env => {
      const envInfo = environmentsInfo?.[env.name];
      const envConfig = envInfo?.config ?? {};
      const solutions = Object.keys(envConfig).map(solution => ({
        name: solution,
        version: envConfig?.[solution],
        ui: envInfo?.uiServices?.find(svc => svc.solution === solution),
      }));
      const preparing = preparingEnvs.includes(env.name);

      return { ...env, solutions, preparing };
    });

    yield put(setEnvironmentsAction(detailedEnvironments));
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

export function* prepareEnvironment(action) {
  const { environment } = action.payload;

  const existingEnv = yield select(
    state => state.app.solutions.environments[environment],
  );
  if (existingEnv === undefined) {
    return { error: `Environment '${environment}' does not exist` };
  } else if (existingEnv?.preparing) {
    return { error: `Environment '${environment}' is preparing` };
  }

  const clusterVersion = yield select(state => state.app.nodes.clusterVersion);
  const result = yield call(
    SaltApi.prepareEnvironment,
    environment,
    clusterVersion,
  );

  if (result.error) {
    yield put(
      addNotificationErrorAction({
        title: intl.translate('prepare_environment'),
        message: result.error,
      }),
    );
  } else {
    yield put(
      addJobAction({
        name: `prepare-env/${environment}`,
        jid: result.return[0].jid,
      }),
    );
    yield call(fetchEnvironments);
  }
}

export function* watchPrepareJobs() {
  while (true) {
    const completedJob = yield take(JOB_COMPLETED);
    const {
      payload: { jobName, status },
    } = completedJob;
    if (jobName.startsWith('prepare-env/')) {
      const envName = jobName.replace(/^(prepare-env\/)/, '');
      if (status.success) {
        yield put(
          addNotificationSuccessAction({
            title: intl.translate('env_preparation'),
            message: intl.translate('env_preparation_success', { envName }),
          }),
        );
      } else {
        yield put(
          addNotificationErrorAction({
            title: intl.translate('env_preparation'),
            message: intl.translate('env_preparation_failed', {
              envName,
              step: status.step,
              reason: status.comment,
            }),
          }),
        );
      }
    }
  }
}

export function* fetchSolutions() {
  const result = yield call(SolutionsApi.getSolutionsConfigMap);
  if (!result.error) {
    const configData = result?.body?.data;
    if (configData) {
      const solutions = Object.keys(configData).map(key => ({
        name: key,
        versions: JSON.parse(configData[key]),
      }));
      yield put(setSolutionsAction(solutions));
    }
  }
  return result;
}

export function* refreshSolutions() {
  // Long-running saga, should be unique for the whole application
  while (true) {
    // Start refreshing on demand
    yield take(REFRESH_SOLUTIONS);
    yield put(setSolutionsRefeshingAction(true));
    while (true) {
      // Spawn the fetch actions in parallel
      yield all([fork(fetchSolutions), fork(fetchEnvironments)]);

      const { interrupt } = yield race({
        interrupt: take(STOP_REFRESH_SOLUTIONS),
        requeue: delay(REFRESH_TIMEOUT),
      });

      if (interrupt) {
        yield put(setSolutionsRefeshingAction(false));
        break;
      }
    }
  }
}

// Sagas
export function* solutionsSaga() {
  yield all([
    fork(refreshSolutions),
    takeEvery(CREATE_ENVIRONMENT, createEnvironment),
  ]);
}
