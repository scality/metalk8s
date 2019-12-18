import { JOB_ID, NODE_NAME } from '../../tests/mocks/salt/constants';
import { data as dataPrintJob } from '../../tests/mocks/salt/printJob';
import { data as dataEventRet } from '../../tests/mocks/salt/eventRet';

import { getJobStatusFromPrintJob, getJobStatusFromEventRet } from './utils';

describe('`getJobStatusFromPrintJob` utility method', () => {
  test('handles a job not yet completed', () => {
    const data = { return: [{ [JOB_ID]: { Result: {} } }] };

    expect(getJobStatusFromPrintJob(data, JOB_ID)).toEqual({
      completed: false,
    });
  });

  test('handles a successful job', () => {
    const data = {
      return: [
        {
          [JOB_ID]: {
            Result: { whateverMasterMinionName: { return: { success: true } } },
          },
        },
      ],
    };

    expect(getJobStatusFromPrintJob(data, JOB_ID)).toEqual({
      completed: true,
      success: true,
    });
  });

  test('handles a failed job', () => {
    expect(getJobStatusFromPrintJob(dataPrintJob, JOB_ID)).toEqual({
      completed: true,
      success: false,
      step: 'Set grains',
      comment: `Updating ${NODE_NAME} failed`,
    });
  });
});

describe('`getJobStatusFromEventRet` utility method', () => {
  test('handles a successful job', () => {
    expect(getJobStatusFromEventRet({ success: true })).toEqual({
      completed: true,
      success: true,
    });
  });

  test('handles a failed job', () => {
    expect(getJobStatusFromEventRet(dataEventRet)).toEqual({
      completed: true,
      success: false,
      step: 'Register the node into etcd cluster',
      comment: "Runner function 'state.orchestrate' executed.",
    });
  });
});
