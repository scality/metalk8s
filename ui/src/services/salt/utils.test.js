import { data as dataPrintJob } from './mockDataPrintJob';
import { data as dataEventRet } from './mockDataEventRet';
import { getJobStatusFromPrintJob, getJobStatusFromEventRet } from './utils';

test('getJobStatusFromPrintJob not completed', () => {
  const data = {
    return: [
      {
        '20190527213228970129': {
          Result: {}
        }
      }
    ]
  };

  const expectedResult = {
    completed: false
  };
  expect(getJobStatusFromPrintJob(data, '20190527213228970129')).toEqual(
    expectedResult
  );
});

test('getJobStatusFromPrintJob completed success', () => {
  const data = {
    return: [
      {
        '20190527213228970129': {
          Result: {
            bootstrap_master: {
              return: {
                success: true
              }
            }
          }
        }
      }
    ]
  };

  const expectedResult = {
    completed: true,
    success: true
  };
  expect(getJobStatusFromPrintJob(data, '20190527213228970129')).toEqual(
    expectedResult
  );
});

test('getJobStatusFromPrintJob completed failed', () => {
  const expectedResult = {
    completed: true,
    success: false,
    step_id: 'Set grains',
    comment: 'Updating node1 failed'
  };
  expect(
    getJobStatusFromPrintJob(dataPrintJob, '20190527213228970129')
  ).toEqual(expectedResult);
});

test('getJobStatusFromEventRet completed success', () => {
  const data = {
    success: true
  };

  const expectedResult = {
    completed: true,
    success: true
  };
  expect(getJobStatusFromEventRet(data, '20190527213228970129')).toEqual(
    expectedResult
  );
});

test('getJobStatusFromEventRet completed failed', () => {
  const expectedResult = {
    completed: true,
    success: false,
    step_id: 'Register the node into etcd cluster',
    comment: "Runner function 'state.orchestrate' executed."
  };
  expect(getJobStatusFromEventRet(dataEventRet)).toEqual(expectedResult);
});
