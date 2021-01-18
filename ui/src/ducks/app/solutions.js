import {
  Effect,
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
import * as CoreApi from '../../services/k8s/core';
import * as SolutionsApi from '../../services/k8s/solutions';
import * as SaltApi from '../../services/salt/api';
import type { APIResult } from '../../types';

import history from '../../history';
import { REFRESH_TIMEOUT } from '../../constants';
import {
  addNotificationSuccessAction,
  addNotificationErrorAction,
} from './notifications';
import { intl } from '../../translations/IntlGlobalProvider';
import { addJobAction, JOB_COMPLETED } from './salt';
import { V1ConfigMap } from '@kubernetes/client-node/dist/gen/model/models';

const OPERATOR_ = '-operator';
const _K8S = 'app.kubernetes.io';
const LABEL_K8S_VERSION = `${_K8S}/version`;

// Actions
export const SET_SOLUTIONS = 'SET_SOLUTIONS';
export const SET_SOLUTIONS_REFRESHING = 'SET_SOLUTIONS_REFRESHING';
export const SET_ENVIRONMENTS = 'SET_ENVIRONMENTS';
const CREATE_ENVIRONMENT = 'CREATE_ENVIRONMENT';
const REFRESH_SOLUTIONS = 'REFRESH_SOLUTIONS';
const STOP_REFRESH_SOLUTIONS = 'STOP_REFRESH_SOLUTIONS';
const PREPARE_ENVIRONMENT = 'PREPARE_ENVIRONMENT';
const DELETE_ENVIRONMENT = 'DELETE_ENVIRONMENT';

// Reducer
const defaultState = {
  solutions: [],
  environments: [],
  isSolutionsRefreshing: false,
};

export type SolutionsState = {
  solutions: any[],
  environments: SolutionsApi.Environment[],
  isSolutionsRefreshing: boolean,
};

export default function reducer(
  state: SolutionsState = defaultState,
  action: any = {},
) {
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

export const setEnvironmentsAction = (
  environments: SolutionsApi.Environment[],
) => {
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

export function prepareEnvironmentAction(envName, solName, solVersion) {
  return {
    type: PREPARE_ENVIRONMENT,
    payload: { envName, solName, solVersion },
  };
}

export function deleteEnvironmentAction(envName) {
  return { type: DELETE_ENVIRONMENT, payload: envName };
}

// Selectors
export const solutionsRefreshingSelector = (state) =>
  state.app.solutions.isSolutionsRefreshing;
export const solutionServicesSelector = (state) => state.app.solutions.services;

// Sagas
export function* fetchEnvironments(): Generator<Effect, void, any> {
  const jobs = yield select((state) => state.app.salt.jobs);
  const preparingEnvs = jobs?.filter(
    (job) => job.type === 'prepare-env/' && !job.completed,
  );
  const environments: SolutionsApi.Environment[] = yield call(
    SolutionsApi.listEnvironments,
  );
  const updatedEnvironments = yield call(updateEnvironments, environments);
  for (const env of updatedEnvironments) {
    env.isPreparing = preparingEnvs?.includes(env.name);
  }
  yield put(setEnvironmentsAction(updatedEnvironments));
  return updatedEnvironments;
}

export function* createEnvironment(action: {
  payload: { name: string },
}): Generator<Effect, void, APIResult<V1ConfigMap>> {
  const { name } = action.payload;
  const resultCreateEnvironment = yield call(
    SolutionsApi.createEnvironment,
    action.payload,
  );

  if (resultCreateEnvironment.error) {
    yield put(
      addNotificationErrorAction({
        title: intl.translate('environment_creation_failed', { envName: name }),
      }),
    );
  }
  yield call(history.push, '/environments');
  yield call(fetchEnvironments);
}

export function* prepareEnvironment(action: {
  payload: { envName: string, solName: string, solVersion: string },
}): Generator<Effect, void, any> {
  const { envName, solName, solVersion } = action.payload;

  const existingEnv: SolutionsApi.Environment[] = yield select(
    (state: RootState) => state.app.solutions.environments,
  );

  const preparingEnv = existingEnv.find((env) => env.name === envName);

  if (preparingEnv === undefined) {
    console.error(`Environment '${envName}' does not exist`);
  } else if (preparingEnv?.preparing) {
    console.error(`Environment '${envName}' is preparing`);
  }

  const addSolutionToEnvironmentResult = yield call(
    SolutionsApi.addSolutionToEnvironment,
    envName,
    solName,
    solVersion,
  );

  if (!addSolutionToEnvironmentResult.error) {
    const clusterVersion = yield select(
      (state) => state.app.nodes.clusterVersion,
    );
    const result = yield call(
      SaltApi.prepareEnvironment,
      envName,
      clusterVersion,
    );
    if (!result.error) {
      yield put(
        addJobAction({
          type: 'prepare-env',
          jid: result.return[0].jid,
          env: envName,
        }),
      );
    } else {
      yield put(
        addNotificationErrorAction({
          title: intl.translate('prepare_environment'),
          message: intl.translate('env_preparation_failed', { envName }),
        }),
      );
    }
  } else {
    yield put(
      addNotificationErrorAction({
        title: intl.translate('add_solution_to_configmap', {
          envName,
        }),
        message: intl.translate('add_solution_to_configmap_failed'),
      }),
    );
  }
}

export function* updateEnvironments(
  environments: SolutionsApi.Environment[],
): Generator<Effect, SolutionsApi.Environment[], any> {
  for (const env of environments) {
    const envConfig = yield call(SolutionsApi.getEnvironmentConfigMap, env);
    if (envConfig) {
      const solutions = Object.keys(envConfig);
      // we may have several soutions in one environment
      for (const solution of solutions) {
        const operatorDeployment = yield call(
          CoreApi.getNamespacedDeployment,
          `${solution}${OPERATOR_}`,
          env.name,
        );
        const operatorVersion =
          operatorDeployment?.body?.metadata?.labels[LABEL_K8S_VERSION];

        if (operatorDeployment) {
          if (env.solutions === undefined) {
            env.solutions = [];
            env.solutions.push({
              name: solution,
              version: operatorVersion,
            });
          } else if (env.solutions.length !== 0) {
            env.solutions.push({
              name: solution,
              version: operatorVersion,
            });
          }
        } else {
          console.error(`Solution: ${env.name} deployment has failed.`);
        }
      }
    }
  }
  return environments;
}

export function* fetchSolutions() {
  const result = yield call(SolutionsApi.getSolutionsConfigMap);
  if (!result.error) {
    const configData = result?.body?.data;
    if (configData) {
      const solutions = Object.keys(configData).map((key) => ({
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

export function* deleteEnvironment(action) {
  const envName = action.payload;
  const result = yield call(SolutionsApi.deleteEnvironment, envName);
  if (!result.error) {
    yield put(
      addNotificationSuccessAction({
        title: intl.translate('environment_deletion'),
        message: intl.translate('environment_delete_success', { envName }),
      }),
    );
    yield call(fetchEnvironments);
  } else {
    yield put(
      addNotificationErrorAction({
        title: intl.translate('environment_deletion'),
        message: intl.translate('environment_delete_failed', {
          envName,
        }),
      }),
    );
  }
}

export function* notifyDeployJobCompleted({ payload: { jid, status } }) {
  const jobs = yield select((state) => state.app.salt.jobs);
  const job = jobs.find((job) => job.jid === jid);
  if (job?.type === 'prepare-env') {
    if (status.success) {
      yield put(
        addNotificationSuccessAction({
          title: intl.translate('env_preparation'),
          message: intl.translate('env_preparation_success', {
            envName: job.env,
          }),
        }),
      );
    } else {
      yield put(
        addNotificationErrorAction({
          title: intl.translate('env_preparation'),
          message: intl.translate('env_preparation_failed', {
            envName: job.env,
            step: status.step,
            reason: status.comment,
          }),
        }),
      );
    }
  }
}

// Sagas
export function* solutionsSaga() {
  yield all([
    fork(refreshSolutions),
    takeEvery(CREATE_ENVIRONMENT, createEnvironment),
    takeEvery(PREPARE_ENVIRONMENT, prepareEnvironment),
    takeEvery(DELETE_ENVIRONMENT, deleteEnvironment),
    takeEvery(JOB_COMPLETED, notifyDeployJobCompleted),
  ]);
}
