import { all, fork } from 'redux-saga/effects';
import { nodesSaga } from './app/nodes';
import { authenticateSaga } from './login';
import { configSaga } from './config';

export default function* rootSaga() {
  yield all([fork(nodesSaga), fork(authenticateSaga), fork(configSaga)]);
}
