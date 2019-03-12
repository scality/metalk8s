import { all, fork } from 'redux-saga/effects';
import { usersSaga } from './users';
import { authenticateSaga } from './login';

export default function* rootSaga() {
  yield all([fork(usersSaga), fork(authenticateSaga)]);
}
