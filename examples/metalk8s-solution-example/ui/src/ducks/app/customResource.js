import { call, put, takeEvery, select, delay } from 'redux-saga/effects';
import semver from 'semver';
import * as ApiK8s from '../../services/k8s/api';
import history from '../../history';
import {
  createDeployment,
  editDeployment,
  fetchSolutionDeployments
} from './deployment';
import { REFRESH_TIMEOUT } from '../../constants';

// Actions
const REFRESH_CUSTOM_RESOURCE = 'REFRESH_CUSTOM_RESOURCE';
const STOP_REFRESH_CUSTOM_RESOURCE = 'STOP_REFRESH_CUSTOM_RESOURCE';
const CREATE_CUSTOM_RESOURCE = 'CREATE_CUSTOM_RESOURCE';

const UPDATE_CUSTOM_RESOURCE = 'UPDATE_CUSTOM_RESOURCE';
const EDIT_CUSTOM_RESOURCE = 'EDIT_CUSTOM_RESOURCE';

// Reducer
const defaultState = {
  list: [],
  isRefreshing: false
};

export default function reducer(state = defaultState, action = {}) {
  switch (action.type) {
    case UPDATE_CUSTOM_RESOURCE:
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

// Action Creators
export const refreshCustomResourceAction = () => {
  return { type: REFRESH_CUSTOM_RESOURCE };
};

export const stopRefreshCustomResourceAction = () => {
  return { type: STOP_REFRESH_CUSTOM_RESOURCE };
};

export const updateCustomResourceAction = payload => {
  return { type: UPDATE_CUSTOM_RESOURCE, payload };
};

export const editCustomResourceAction = payload => {
  return { type: EDIT_CUSTOM_RESOURCE, payload };
};

export const createCustomresourceAction = payload => {
  return { type: CREATE_CUSTOM_RESOURCE, payload };
};

// Sagas
export function* fetchCustomResource() {
  const results = yield call(ApiK8s.getCustomResource);
  if (!results.error) {
    yield put(
      updateCustomResourceAction({
        list: results.body.items.map(cr => {
          return {
            name: cr.metadata.name,
            namespace: cr.metadata.namespace,
            replicas: cr.spec.replicas,
            version: cr.spec.version
          };
        })
      })
    );
  }
  return results;
}

export function* createCustomResource({ payload }) {
  const { name, namespaces, replicas, version } = payload;
  const body = {
    apiVersion: 'solution.com/v1alpha1',
    kind: 'Example',
    metadata: {
      name: name
    },
    spec: {
      replicas: parseInt(replicas, 10),
      version
    }
  };
  let result = null;

  yield call(fetchSolutionDeployments);
  const deployements = yield select(state => state.app.deployments.list);
  if (deployements && deployements.length) {
    const deployementVersion = deployements[0].version;
    if (semver.gt(deployementVersion, version)) {
      result = yield call(ApiK8s.createCustomResource, body, namespaces);
    } else {
      result = yield call(ApiK8s.createCustomResource, body, namespaces);
      if (!result.error) {
        yield call(editDeployment, version, deployements[0].name, namespaces);
      }
    }
  } else {
    result = yield call(ApiK8s.createCustomResource, body, namespaces);
    if (!result.error) {
      result = yield call(createDeployment, namespaces, version);
    }
  }
  if (!result.error) {
    yield call(fetchCustomResource);
    yield call(history.push, `/customResource`);
  }
}

export function* editCustomResource({ payload }) {
  const { name, namespaces, replicas, version } = payload;
  const body = {
    apiVersion: 'solution.com/v1alpha1',
    kind: 'Example',
    metadata: {
      name: name
    },
    spec: {
      replicas: parseInt(replicas, 10),
      version
    }
  };
  const CRs = yield select(state => state.app.customResource.list);
  const oldVersion = CRs.find(cr => cr.name === name).version;

  let result = null;

  if (semver.gt(oldVersion, version)) {
    result = yield call(ApiK8s.updateCustomResource, body, namespaces, name);
  } else {
    yield call(fetchSolutionDeployments);
    const deployements = yield select(state => state.app.deployments.list);

    if (deployements && deployements.length) {
      const deployementVersion = deployements[0].version;
      if (semver.gt(deployementVersion, version)) {
        result = yield call(
          ApiK8s.updateCustomResource,
          body,
          namespaces,
          name
        );
      } else {
        result = yield call(
          ApiK8s.updateCustomResource,
          body,
          namespaces,
          name
        );
        if (!result.error) {
          yield call(editDeployment, version, deployements[0].name, namespaces);
        }
      }
    }
  }
  if (!result.error) {
    yield call(fetchCustomResource);
    yield call(history.push, `/customResource`);
  }
}

export function* refreshCustomResource() {
  yield put(
    updateCustomResourceAction({
      isRefreshing: true
    })
  );
  const results = yield call(fetchCustomResource);
  if (!results.error) {
    yield delay(REFRESH_TIMEOUT);
    const isRefreshing = yield select(
      state => state.app.customResource.isRefreshing
    );
    if (isRefreshing) {
      yield call(refreshCustomResource);
    }
  }
}

export function* stopRefreshCustomResources() {
  yield put(
    updateCustomResourceAction({
      isRefreshing: false
    })
  );
}

export function* customResourceSaga() {
  yield takeEvery(REFRESH_CUSTOM_RESOURCE, refreshCustomResource);
  yield takeEvery(STOP_REFRESH_CUSTOM_RESOURCE, stopRefreshCustomResources);
  yield takeEvery(CREATE_CUSTOM_RESOURCE, createCustomResource);
  yield takeEvery(EDIT_CUSTOM_RESOURCE, editCustomResource);
}
