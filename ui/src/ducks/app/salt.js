import {
  all,
  call,
  delay,
  fork,
  put,
  select,
  take,
  takeEvery,
} from 'redux-saga/effects';
import { eventChannel, END } from 'redux-saga';
import * as ApiSalt from '../../services/salt/api';
import {
  getJobStatusFromEventRet,
  listJobsFromLocalStorage,
  getJobStatusFromPrintJob,
  addJobToLocalStorage,
  removeJobFromLocalStorage,
} from '../../services/salt/utils';

// Actions
const ADD_JOB = 'ADD_JOB';
const REMOVE_JOB = 'REMOVE_JOB';
const ADD_JOB_EVENT = 'ADD_JOB_EVENT';
const CONNECT_SALT_API = 'CONNECT_SALT_API';
export const JOB_COMPLETED = 'JOB_COMPLETED';

// Reducer
const defaultState = {
  jobs: [],
  connected: false,
};

export default function reducer(state = defaultState, action = {}) {
  switch (action.type) {
    case ADD_JOB:
      return {
        ...state,
        jobs: [ ...state.jobs, action.payload],
      };
    case REMOVE_JOB:
      return {
        ...state,
        jobs: state.jobs.filter(job => job.jid !== action.payload.jid),
      };
    case ADD_JOB_EVENT:
      return {
        ...state,
        jobs: state.jobs.map(job =>
          job.jid === action.payload.jid
            ? { ...job, events: [...job.events, action.payload.event] }
            : job,
        ),
      };
    case JOB_COMPLETED:
      return {
        ...state,
        jobs: state.jobs.map(job =>
          job.jid === action.payload.jid
            ? {
                ...job,
                completed: true,
                completedAt: action.payload.completedAt,
                status: action.payload.status,
              }
            : job,
        ),
      };
    case CONNECT_SALT_API:
      return { ...state, connected: true };
    default:
      return state;
  }
}

// Action Creators
const defaultJob = {
  name: '',
  jid: null,
  completed: false,
  completedAt: null,
  status: {},
  events: [],
};

export function addJobAction(job) {
  return { type: ADD_JOB, payload: { ...defaultJob, ...job } };
}

export function removeJobAction(job) {
  return { type: REMOVE_JOB, payload: job };
}

export function connectSaltApiAction(payload) {
  return { type: CONNECT_SALT_API, payload };
}

function addJobEventAction(jid, event) {
  return { type: ADD_JOB_EVENT, payload: { jid, event } };
}

function setJobCompletedAction(jid, { completedAt, status }) {
  return { type: JOB_COMPLETED, payload: { jid, completedAt, status } };
}

// Sagas
function* initialize() {
  yield take(CONNECT_SALT_API);
  const savedJobs = listJobsFromLocalStorage();
  yield all(savedJobs.map(job => put(addJobAction(job))));
  yield all(savedJobs.map(job => call(refreshJobStatus, job)));
}

function* manageLocalStorage() {
  while (true) {
    const action = yield take([ADD_JOB, REMOVE_JOB]);

    const job = action.payload;
    if (action.type === ADD_JOB) {
      addJobToLocalStorage(job.jid, job.name);
    } else {
      removeJobFromLocalStorage(job.jid, job.name);
    }
  }
}

function* refreshJobStatus(job) {
  const result = yield call(ApiSalt.printJob, job.jid);
  // TODO: error handling?
  const status = getJobStatusFromPrintJob(result, job.jid);
  return yield* updateJobStatus(job, status);
}

function* updateJobStatus(job, status) {
  if (status.completed) {
    const completedTime = new Date();
    yield put(
      setJobCompletedAction(job.jid, {
        completedAt: completedTime.toISOString(),
        status,
      }),
    );
  }
}

// Watch Salt events {{{
function* readJobEvent(job, event) {
  const eventTag = event?.tag ?? '';

  if (eventTag.includes('/ret')) {
    const status = getJobStatusFromEventRet(event.data);
    return yield* updateJobStatus(job, status);
  }
}

function createChannelFromSource(eventSrc) {
  const subs = emitter => {
    eventSrc.onmessage = msg => {
      emitter(msg);
    };
    eventSrc.onerror = () => {
      emitter(END);
    };
    return () => {
      eventSrc.close();
    };
  };
  return eventChannel(subs);
}

export function* watchSaltEvents({ payload: { url, token } }) {
  const eventSrc = new EventSource(`${url}/events?token=${token}`);
  const channel = yield call(createChannelFromSource, eventSrc);

  while (true) {
    const event = yield take(channel);
    const data = JSON.parse(event.data);

    const jobs = yield select(state => state.app.salt.jobs);
    const relatedJob = jobs.find(job => data.tag.includes(job.jid));

    if (relatedJob !== undefined) {
      yield all([
        put(addJobEventAction(relatedJob.jid, data)),
        fork(readJobEvent, relatedJob, data),
      ]);
    }
  }
}
// }}}

// Garbage collection of jobs in the Redux state {{{
const JOB_EXPIRATION_MS = 5 * 60 * 1000; // 5 minutes
const JOB_GC_DELAY = 5 * 1000; // 5 seconds

function checkJobExpiry(job) {
  if (!job.completed) {
    return false;
  }
  const timeSinceCompleted = Date.now() - Date.parse(job.completedAt);
  return timeSinceCompleted > JOB_EXPIRATION_MS;
}

export function* garbageCollectJobs() {
  while (true) {
    const jobs = yield select(state => state.app.salt.jobs);
    const toRemove = jobs.filter(checkJobExpiry);
    yield all(toRemove.map(job => put(removeJobAction, job)));
    yield delay(JOB_GC_DELAY);
  }
}
// }}}

export function* saltSaga() {
  yield all([
    fork(initialize),
    fork(manageLocalStorage),
    fork(garbageCollectJobs),
    takeEvery(CONNECT_SALT_API, watchSaltEvents),
  ]);
}
