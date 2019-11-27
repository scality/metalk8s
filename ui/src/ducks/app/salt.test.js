import { channel } from 'redux-saga';
import {
  all,
  call,
  put,
  actionChannel,
  take,
  select,
  delay,
} from 'redux-saga/effects';

import { JOBS } from '../../services/salt/utils';

import {
  // sagas to test
  initialize,
  manageLocalStorage,
  garbageCollectJobs,
  updateJobStatus,
  watchSaltEvents,
  // action creators to test
  addJobAction,
  // values to check in tests
  ADD_JOB,
  REMOVE_JOB,
  JOB_COMPLETED,
  JOB_GC_DELAY,
  removeJobAction,
  setJobCompletedAction,
  setJobStatusAction,
  allJobsSelector,
  refreshJobStatus,
  createChannelFromSource,
} from './salt';

const exampleJob = { name: 'example', jid: '12345', completedAt: null };

describe('`addJobAction` action creator', () => {
  test('handles a job in progress', () => {
    const action = addJobAction(exampleJob);
    expect(action).toEqual({
      type: ADD_JOB,
      payload: {
        ...exampleJob,
        completed: false,
        status: {},
        events: [],
      },
    });
  });

  test('handles a completed job', () => {
    const action = addJobAction({ ...exampleJob, completedAt: 'now' });
    expect(action).toEqual({
      type: ADD_JOB,
      payload: {
        ...exampleJob,
        completedAt: 'now',
        completed: true,
        status: {},
        events: [],
      },
    });
  });
});

describe('`initialize` saga', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('has the expected nominal flow', () => {
    localStorage.setItem(JOBS, JSON.stringify([exampleJob]));
    const gen = initialize();
    // Add all jobs to state
    expect(gen.next().value).toEqual(all([put(addJobAction(exampleJob))]));
    // Refresh all jobs status
    expect(gen.next().value).toEqual(all([call(refreshJobStatus, exampleJob)]));
  });
});

describe('`manageLocalStorage` saga', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('has the expected nominal flow', () => {
    const gen = manageLocalStorage();
    const testChan = channel();

    expect(gen.next().value).toEqual(
      actionChannel([ADD_JOB, REMOVE_JOB, JOB_COMPLETED]),
    );
    expect(gen.next(testChan).value).toEqual(take(testChan));

    let nextAction = addJobAction(exampleJob);
    expect(gen.next(nextAction).value).toEqual(take(testChan));
    expect(JSON.parse(localStorage.getItem(JOBS))).toEqual([exampleJob]);

    nextAction = setJobCompletedAction(exampleJob.jid, 'now', null);
    expect(gen.next(nextAction).value).toEqual(take(testChan));
    expect(JSON.parse(localStorage.getItem(JOBS))).toEqual([
      { ...exampleJob, completedAt: 'now' },
    ]);

    nextAction = removeJobAction(exampleJob);
    expect(gen.next(nextAction).value).toEqual(take(testChan));
    expect(localStorage.getItem(JOBS)).toBe(null);
  });
});

describe('`updateJobStatus` saga', () => {
  test('does nothing for jobs in progress', () => {
    const gen = updateJobStatus(exampleJob, { completed: false });
    expect(gen.next().done).toBe(true);
  });

  test("marks a job as completed if it wasn't already", () => {
    const status = { completed: true };
    const gen = updateJobStatus(exampleJob, status);
    expect(gen.next().value).toMatchObject(
      put({
        type: JOB_COMPLETED,
        // TODO: we can't know the 'completedAt' value unless we mock Date()...
        payload: { jid: exampleJob.jid, status },
      }),
    );
    expect(gen.next().done).toBe(true);
  });

  test("simply updates a job's status if it was already completed", () => {
    const status = { completed: true };
    const gen = updateJobStatus({ ...exampleJob, completedAt: 'now' }, status);
    expect(gen.next().value).toEqual(
      put(setJobStatusAction(exampleJob.jid, status)),
    );
    expect(gen.next().done).toBe(true);
  });
});

describe('`garbageCollectJobs` saga', () => {
  const gen = garbageCollectJobs();

  beforeEach(() => {
    // each loop first reads the existing jobs in the state
    expect(gen.next().value).toEqual(select(allJobsSelector));
  });

  afterEach(() => {
    // after each loop, the saga waits for some time
    expect(gen.next().value).toEqual(delay(JOB_GC_DELAY));
  });

  test('does nothing by default', () => {
    expect(gen.next([]).value).toEqual(all([]));
  });

  test('ignores jobs in progress', () => {
    expect(gen.next([exampleJob]).value).toEqual(all([]));
  });

  const currentDate = new Date();
  const recentJob = {
    ...exampleJob,
    completedAt: currentDate.toISOString(),
    completed: true,
  };

  test('ignores recently completed jobs', () => {
    expect(gen.next([recentJob]).value).toEqual(all([]));
  });

  const oldDate = new Date();
  oldDate.setDate(currentDate.getDate() - 1); // 1 day old
  const oldJob = {
    ...exampleJob,
    completedAt: oldDate.toISOString(),
    completed: true,
  };

  test.each([
    ['[old]', [oldJob]],
    ['[recent, old]', [recentJob, oldJob]],
  ])('removes old completed jobs: %s', (_, jobs) => {
    expect(gen.next(jobs).value).toEqual(all([put(removeJobAction(oldJob))]));
  });
});

describe('`watchSaltEvents` saga', () => {
  test.todo('need to mock EventSource');
});
