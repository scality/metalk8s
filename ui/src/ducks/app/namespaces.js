import { call, put, takeEvery } from 'redux-saga/effects';

import {
  addNotificationSuccessAction,
  addNotificationErrorAction
} from './notifications';
import history from '../../history';
import { intl } from '../../translations/IntlGlobalProvider';
import * as ApiK8s from '../../services/k8s/api';

// Actions
const CREATE_NAMESPACES = 'CREATE_NAMESPACES';

// Action Creators
export const createNamespacesAction = payload => {
  return { type: CREATE_NAMESPACES, payload };
};

// Sagas
export function* createNamespaces({ payload }) {
  const body = {
    metadata: {
      name: payload.name
    }
  };
  const result = yield call(ApiK8s.createNamespace, body);
  if (!result.error) {
    yield call(history.push, '/solutions');
    yield put(
      addNotificationSuccessAction({
        title: intl.translate('namespace_creation'),
        message: intl.translate('namespace_creation_success', {
          name: payload.name
        })
      })
    );
  } else {
    yield put(
      addNotificationErrorAction({
        title: intl.translate('namespace_creation'),
        message: intl.translate('node_creation_failed', { name: payload.name })
      })
    );
  }
}

export function* namespacesSaga() {
  yield takeEvery(CREATE_NAMESPACES, createNamespaces);
}
