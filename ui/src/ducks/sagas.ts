import { all, fork } from 'redux-saga/effects';
import { monitoringSaga } from './app/monitoring';
import { nodesSaga } from './app/nodes';
import { podsSaga } from './app/pods';
import { saltSaga } from './app/salt';
import { volumesSaga } from './app/volumes';
import { configSaga } from './config';
import { authenticateSaga } from './login';
export default function* rootSaga() {
  yield all([
    fork(authenticateSaga),
    fork(configSaga),
    fork(monitoringSaga),
    fork(nodesSaga),
    fork(podsSaga),
    fork(saltSaga),
    fork(volumesSaga),
  ]);
}
