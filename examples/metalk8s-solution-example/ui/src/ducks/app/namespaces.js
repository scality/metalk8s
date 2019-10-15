import { call } from 'redux-saga/effects';
import * as ApiK8s from '../../services/k8s/api';

// Sagas
export function* createNamespaces(name) {
  const results = yield call(ApiK8s.getNamespaces, name);
  if (results.error) {
    const body = {
      metadata: {
        name: name
      }
    };
    const result = yield call(ApiK8s.createNamespace, body);
    return result;
  }
  return results;
}
