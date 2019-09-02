import { all, fork } from 'redux-saga/effects';
import { configSaga } from './config';
import { authenticateSaga } from './login';
import { customResourceSaga } from './app/customResource';
import { namespacesSaga } from './app/namespaces';
import { deploymentSaga } from './app/deployment';

export default function* rootSaga() {
  yield all([
    fork(configSaga),
    fork(authenticateSaga),
    fork(customResourceSaga),
    fork(namespacesSaga),
    fork(deploymentSaga)
  ]);
}
