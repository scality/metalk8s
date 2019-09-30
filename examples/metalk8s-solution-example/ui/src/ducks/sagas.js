import { all, fork } from 'redux-saga/effects';
import { configSaga } from './config';
import { authenticateSaga } from './login';
import { clockServerSaga } from './app/clockServer';
import { versionServerSaga } from './app/versionServer';
import { deploymentSaga } from './app/deployment';
import { environmentSaga } from './app/environment';

export default function* rootSaga() {
  yield all([
    fork(configSaga),
    fork(authenticateSaga),
    fork(clockServerSaga),
    fork(versionServerSaga),
    fork(deploymentSaga),
    fork(environmentSaga)
  ]);
}
