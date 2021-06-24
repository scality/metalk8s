import {
  actionChannel,
  all,
  call,
  delay,
  fork,
  put,
  select,
  take,
  takeLeading,
} from 'redux-saga/effects';
import { eventChannel, END } from 'redux-saga';
import type { RootState } from '../reducer';
import * as ApiSalt from '../../services/salt/api';
import {
  getJobStatusFromEventRet,
  listJobsFromLocalStorage,
  getJobStatusFromPrintJob,
  addJobToLocalStorage,
  removeJobFromLocalStorage,
  markJobCompleteInLocalStorage,
} from '../../services/salt/utils';
import { addNotificationErrorAction } from './notifications';

// Actions
export const ADD_JOB = 'ADD_JOB';
export const REMOVE_JOB = 'REMOVE_JOB';
const ADD_JOB_EVENT = 'ADD_JOB_EVENT';
export const CONNECT_SALT_API = 'CONNECT_SALT_API';
const SET_JOB_STATUS = 'SET_JOB_STATUS';
export const JOB_COMPLETED = 'JOB_COMPLETED';

// Reducer
const defaultState = {
  jobs: [],
  connected: false,
};

export type SaltState = {
  jobs: any[], // todo: type salt job
  connected: boolean,
};

export default function reducer(state: SaltState = defaultState, action = {}) {
  switch (action.type) {
    case ADD_JOB:
      return {
        ...state,
        jobs: [...state.jobs, action.payload],
      };
    case REMOVE_JOB:
      return {
        ...state,
        jobs: state.jobs.filter((job) => job.jid !== action.payload.jid),
      };
    case ADD_JOB_EVENT:
      return {
        ...state,
        jobs: state.jobs.map((job) =>
          job.jid === action.payload.jid
            ? { ...job, events: [...job.events, action.payload.event] }
            : job,
        ),
      };
    case JOB_COMPLETED:
      return {
        ...state,
        jobs: state.jobs.map((job) =>
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
    case SET_JOB_STATUS:
      return {
        ...state,
        jobs: state.jobs.map((job) =>
          job.jid === action.payload.jid
            ? { ...job, status: action.payload.status }
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
  type: '',
  jid: null,
  completed: false,
  completedAt: null,
  status: {},
  events: [],
};

export function addJobAction(job) {
  const payload = { ...defaultJob, ...job };
  if (payload.completedAt !== null) {
    payload.completed = true;
  }
  return { type: ADD_JOB, payload };
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

export function setJobCompletedAction(jid, completedAt, status) {
  return { type: JOB_COMPLETED, payload: { jid, completedAt, status } };
}

export function setJobStatusAction(jid, status) {
  return { type: SET_JOB_STATUS, payload: { jid, status } };
}

// Selectors
export const allJobsSelector = (state: RootState) => state.app.salt.jobs;
const intlSelector = (state: RootState) => state.config.intl;

// Sagas
export function* initialize(payload) {
  const savedJobs = listJobsFromLocalStorage();
  yield all(savedJobs.map((job) => put(addJobAction(job))));
  yield all(savedJobs.map((job) => call(refreshJobStatus, job)));

  // Once state is initialized from localStorage, we can start watching Salt
  // Event bus (doing it before may loose some events since no job exists)
  yield fork(watchSaltEvents, payload);
}

export function* manageLocalStorage() {
  // NOTE: instead of creating a saga per action type, since the operations on
  // localStorage rely on its previous state, we need to execute them serially.
  // We don't set up a buffer size as operations should be infrequent and fast.
  const channel = yield actionChannel([ADD_JOB, REMOVE_JOB, JOB_COMPLETED]);
  while (true) {
    const { type, payload: job } = yield take(channel);
    switch (type) {
      case ADD_JOB:
        addJobToLocalStorage({
          ...job,
          // remove live data only useful in Redux store
          events: undefined,
          status: undefined,
          completed: undefined,
        });
        break;
      case REMOVE_JOB:
        removeJobFromLocalStorage(job.jid);
        break;
      case JOB_COMPLETED:
        markJobCompleteInLocalStorage(job.jid, job.completedAt);
        break;
      default:
        break;
    }
  }
}

export function* refreshJobStatus(job) {
  const result = yield call(ApiSalt.printJob, job.jid);
  const intl = yield call(intlSelector);
  if (result.error) {
    yield put(
      addNotificationErrorAction({
        title: intl.formatMessage({ id: 'salt_job' }),
        message: JSON.stringify(result.error),
      }),
    );
  }
  const status = getJobStatusFromPrintJob(result, job.jid);
  yield call(updateJobStatus, job, status);
}

export function* updateJobStatus(job, status) {
  if (status.completed) {
    // We only have useful info for the status of a completed Job
    if (job.completedAt === null) {
      // We only want to trigger the JOB_COMPLETED action if the Job wasn't
      // already completed (usually this action will be watched to trigger
      // notifications).
      const completedTime = new Date();
      yield put(
        setJobCompletedAction(job.jid, completedTime.toISOString(), status),
      );
    } else {
      yield put(setJobStatusAction(job.jid, status));
    }
  }
}

// Watch Salt events {{{
function* readJobEvent(job, event) {
  const eventTag = event?.tag ?? '';

  if (eventTag.includes('/ret')) {
    const status = getJobStatusFromEventRet(event.data);
    yield call(updateJobStatus, job, status);
  }
}

export function createChannelFromSource(eventSrc) {
  const subs = (emitter) => {
    eventSrc.onmessage = (msg) => {
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

    const jobs = yield select(allJobsSelector);
    const relatedJob = jobs.find((job) => data.tag.includes(job.jid));

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
export const JOB_GC_DELAY = 5 * 1000; // 5 seconds

function checkJobExpiry(job) {
  if (!job.completed) {
    return false;
  }
  const timeSinceCompleted = Date.now() - Date.parse(job.completedAt);
  return timeSinceCompleted > JOB_EXPIRATION_MS;
}

export function* garbageCollectJobs() {
  while (true) {
    const jobs = yield select(allJobsSelector);
    const toRemove = jobs.filter(checkJobExpiry);
    yield all(toRemove.map((job) => put(removeJobAction(job))));
    yield delay(JOB_GC_DELAY);
  }
}
// }}}

export function* saltSaga() {
  yield all([
    fork(manageLocalStorage),
    fork(garbageCollectJobs),
    takeLeading(CONNECT_SALT_API, initialize),
  ]);
}
