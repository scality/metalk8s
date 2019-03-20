import { all, fork } from 'redux-saga/effects';
import { nodesSaga } from './app/nodes';
import { authenticateSaga } from './login';

export default function* rootSaga() {
  yield all([fork(nodesSaga), fork(authenticateSaga)]);
}
