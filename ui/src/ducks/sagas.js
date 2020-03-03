import { all, fork } from 'redux-saga/effects';
import { layoutSaga } from './app/layout';
import { monitoringSaga } from './app/monitoring';
import { nodesSaga } from './app/nodes';
import { podsSaga } from './app/pods';
import { saltSaga } from './app/salt';
import { solutionsSaga } from './app/solutions';
import { volumesSaga } from './app/volumes';
import { authenticateSaga } from './login';
import { configSaga } from './config';

export default function* rootSaga() {
  yield all([
    fork(authenticateSaga),
    fork(configSaga),
    fork(layoutSaga),
    fork(monitoringSaga),
    fork(nodesSaga),
    fork(podsSaga),
    fork(saltSaga),
    fork(solutionsSaga),
    fork(volumesSaga),
  ]);
}
