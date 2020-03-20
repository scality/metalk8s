import {
  all,
  call,
  delay,
  fork,
  put,
  race,
  take,
  takeEvery,
  select,
} from 'redux-saga/effects';
import * as SolutionsApi from '../../services/k8s/solutions';
import * as SaltApi from '../../services/salt/api';

import history from '../../history';
import { REFRESH_TIMEOUT } from '../../constants';
import {
  addNotificationSuccessAction,
  addNotificationErrorAction,
} from './notifications';
import { intl } from '../../translations/IntlGlobalProvider';
import { addJobAction, JOB_COMPLETED } from './salt';

const OPERATOR_ = '-operator';
const UI_ = '-ui';

// Actions
export const SET_SOLUTIONS = 'SET_SOLUTIONS';
export const SET_SOLUTIONS_REFRESHING = 'SET_SOLUTIONS_REFRESHING';
export const SET_ENVIRONMENTS = 'SET_ENVIRONMENTS';
const CREATE_ENVIRONMENT = 'CREATE_ENVIRONMENT';
const REFRESH_SOLUTIONS = 'REFRESH_SOLUTIONS';
const STOP_REFRESH_SOLUTIONS = 'STOP_REFRESH_SOLUTIONS';
const PREPARE_ENVIRONMENT = 'PREPARE_ENVIRONMENT';

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

export function prepareEnvironmentAction(environment, solution) {
  return { type: PREPARE_ENVIRONMENT, payload: { environment, solution } };
}

// Selectors
export const solutionsRefreshingSelector = state =>
  state.app.solutions.isSolutionsRefreshing;
export const solutionServicesSelector = state => state.app.solutions.services;

// Sagas
export function* fetchEnvironments() {
  const jobs = yield select(state => state.app.salt.jobs);
  const preparingEnvs = jobs
    ?.filter(job => job.name.startsWith('prepare-env/') && !job.completed)
    .map(job => job.name.replace(/^(prepare-env\/)/, ''));
  const environments = yield call(SolutionsApi.listEnvironments);
  if (!environments.error) {
    for (const env of environments) {
      const envConfig = yield call(
        SolutionsApi.getNamespacedConfigmap,
        env.name,
      );
      if (!envConfig.error && envConfig.body.data) {
        // we may have several soutions in one environment
        env.solutions = [];
        const solutions = Object.keys(envConfig.body.data);
        for (const solution of solutions) {
          const solutionOperatorDeployment = yield call(
            SolutionsApi.getNamespacedDeployment,
            `${solution}${OPERATOR_}`,
            env.name,
          );
          const solutionUIDeployment = yield call(
            SolutionsApi.getNamespacedDeployment,
            `${solution}${UI_}`,
            env.name,
          );
          if (
            !solutionOperatorDeployment.error &&
            !solutionUIDeployment.error
          ) {
            env.solutions.push({
              name: solution,
              version: envConfig?.body?.data?.[solution],
            });
          } else {
            console.error(`Solution: ${env.name} deployment has failed.`);
          }
        }
      } else {
        env.solutions = [];
      }
      env.isPreparing = preparingEnvs?.includes(env.name);
    }
  }
  yield put(setEnvironmentsAction(environments));
  return environments;
}

export function* createEnvironment(action) {
  const { name } = action.payload;

  const resultCreateEnvironment = yield call(
    SolutionsApi.createEnvironment,
    action.payload,
  );

  if (!resultCreateEnvironment.error) {
    const resultCreateNamespacedConfigMap = yield call(
      SolutionsApi.createNamespacedConfigMap,
      name,
    );
    if (!resultCreateNamespacedConfigMap.error) {
      yield call(fetchEnvironments);
      history.push('/solutions');
      return resultCreateEnvironment;
    } else {
      yield put(
        addNotificationErrorAction({
          title: intl.translate('environment_creation_failed', { name: name }),
          message: resultCreateNamespacedConfigMap.error,
        }),
      );
    }
  } else {
    yield put(
      addNotificationErrorAction({
        title: intl.translate('environment_creation_failed', { name: name }),
        message: resultCreateEnvironment.error,
      }),
    );
  }
}

export function* prepareEnvironment(action) {
  const { environment, solution } = action.payload;

  const addedSolution = { [solution.solution.value]: solution.version.value };
  const existingEnv = yield select(state => state.app.solutions.environments);
  const preparingEnv = existingEnv.find(env => (env.name = environment));

  if (preparingEnv === undefined) {
    console.error(`Environment '${environment}' does not exist`);
  } else if (preparingEnv?.preparing) {
    console.error(`Environment '${environment}' is preparing`);
  }

  const patchConfigMapResult = yield call(
    SolutionsApi.patchNamespacedConfigMap,
    environment,
    addedSolution,
  );
  if (!patchConfigMapResult.error) {
    const clusterVersion = yield select(
      state => state.app.nodes.clusterVersion,
    );
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
      yield call(watchPrepareJobs);
      yield call(fetchEnvironments);
    }
  } else {
    yield put(
      addNotificationErrorAction({
        title: intl.translate('prepare_environment'),
        message: patchConfigMapResult.error,
      }),
    );
  }
}

export function* watchPrepareJobs() {
  while (true) {
    const completedJob = yield take(JOB_COMPLETED);
    const {
      payload: { name, status },
    } = completedJob;

    if (name.startsWith('prepare-env/')) {
      const envName = name.replace(/^(prepare-env\/)/, '');
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
    takeEvery(PREPARE_ENVIRONMENT, prepareEnvironment),
  ]);
}
