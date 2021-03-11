import { renderHook } from '@testing-library/react-hooks';
import {
  sortCapacity,
  addMissingDataPoint,
  fromMilliSectoAge,
  useTableSortURLSync,
  linuxDrivesNamingIncrement,
} from './utils';

const testcases = [
  { storageCapacity: '1Ki' },
  { storageCapacity: '1Gi' },
  { storageCapacity: '100Mi' },
  { storageCapacity: '10Gi' },
  { storageCapacity: '1Mi' },
];

const testcases2 = [
  { storageCapacity: '42949670k' },
  { storageCapacity: '100Mi' },
  { storageCapacity: '250Gi' },
  { storageCapacity: '1Gi' },
  { storageCapacity: '1Mi' },
  { storageCapacity: '11111111111' },
  { storageCapacity: '10Gi' },
];

it('should sort correctly the array', () => {
  const result = sortCapacity(testcases);
  expect(result).toEqual([
    { storageCapacity: '1Ki' },
    { storageCapacity: '1Mi' },
    { storageCapacity: '100Mi' },
    { storageCapacity: '1Gi' },
    { storageCapacity: '10Gi' },
  ]);

  const result2 = sortCapacity(testcases2, 'storageCapacity');
  expect(result2).toEqual([
    { storageCapacity: '1Mi' },
    { storageCapacity: '100Mi' },
    { storageCapacity: '1Gi' },
    { storageCapacity: '10Gi' },
    { storageCapacity: '11111111111' },
    { storageCapacity: '42949670k' },
    { storageCapacity: '250Gi' },
  ]);
});

it('should return an empty array if no arguments', () => {
  const result = sortCapacity();
  expect(result).toEqual([]);
});

it('should not break when the user put the wrong sortBy', () => {
  const result = sortCapacity(testcases, 'toto');
  expect(result).toEqual([
    { storageCapacity: '1Ki' },
    { storageCapacity: '1Gi' },
    { storageCapacity: '100Mi' },
    { storageCapacity: '10Gi' },
    { storageCapacity: '1Mi' },
  ]);
});

it('should keep the original sequence when the user put the wrong sortDirection', () => {
  const result = sortCapacity(testcases, 'storageCapacity', 'toto');
  expect(result).toEqual([
    { storageCapacity: '1Ki' },
    { storageCapacity: '1Gi' },
    { storageCapacity: '100Mi' },
    { storageCapacity: '10Gi' },
    { storageCapacity: '1Mi' },
  ]);
});

it('should not break when a item is null', () => {
  const testcases = [
    { storageCapacity: '1Ki' },
    { storageCapacity: '1Gi' },
    { storageCapacity: '100Mi' },
    null,
    { storageCapacity: '1Mi' },
  ];

  const result = sortCapacity(testcases);
  expect(result).toEqual([
    { storageCapacity: '1Ki' },
    { storageCapacity: '1Mi' },
    { storageCapacity: '100Mi' },
    { storageCapacity: '1Gi' },
    null,
  ]);
});

it('test the sort with a custom sortBy', () => {
  const testcases = [
    { yanjin: '1Ki' },
    { yanjin: '1Gi' },
    { yanjin: '100Mi' },
    { yanjin: '1Mi' },
  ];

  const result = sortCapacity(testcases, 'yanjin');
  expect(result).toEqual([
    { yanjin: '1Ki' },
    { yanjin: '1Mi' },
    { yanjin: '100Mi' },
    { yanjin: '1Gi' },
  ]);
});

// test for addMissingDataPoint function
const originalValue = [
  [0, 0],
  [1, 1],
  [2, 2],
  [3, 3],
  [4, 4],
  [5, 5],
  [6, 6],
  [8, 8],
  [9, 9],
  [10, 10],
];
const startingTimeStamp = 0;
const sampleDuration = 11;
const sampleFrequency = 1;
const newValues = [
  [0, 0],
  [1, 1],
  [2, 2],
  [3, 3],
  [4, 4],
  [5, 5],
  [6, 6],
  [7, null],
  [8, 8],
  [9, 9],
  [10, 10],
];
it('should add missing data point with null', () => {
  const result = addMissingDataPoint(
    originalValue,
    startingTimeStamp,
    sampleDuration,
    sampleFrequency,
  );
  expect(result).toEqual(newValues);
});

it('should return an empty array when the original dataset is empty', () => {
  const result = addMissingDataPoint(
    [],
    startingTimeStamp,
    sampleDuration,
    sampleFrequency,
  );
  expect(result).toEqual([]);
});

it('should return an empty array when the starting timestamp is undefined', () => {
  const result = addMissingDataPoint(
    originalValue,
    undefined,
    sampleDuration,
    sampleFrequency,
  );
  expect(result).toEqual([]);
});

it('should return an empty array when sample duration is less than or equal to zero', () => {
  const result = addMissingDataPoint(
    originalValue,
    startingTimeStamp,
    0,
    sampleFrequency,
  );
  expect(result).toEqual([]);
});

it('should return an empty array when sample frequency is less than or equal to zero', () => {
  const result = addMissingDataPoint(
    originalValue,
    startingTimeStamp,
    sampleDuration,
    -1,
  );
  expect(result).toEqual([]);
});

it('should return an empty array when sample frequency is undefined', () => {
  const result = addMissingDataPoint(
    originalValue,
    startingTimeStamp,
    sampleDuration,
    undefined,
  );
  expect(result).toEqual([]);
});

const originalValueWithAllZero = [
  [0, 0],
  [1, 0],
  [2, 0],
  [3, 0],
  [4, 0],
  [5, 0],
  [6, 0],
  [7, 0],
  [8, 0],
  [9, 0],
  [10, 0],
];
it('should return all zero when the original dataset is all zero', () => {
  const result = addMissingDataPoint(
    originalValueWithAllZero,
    startingTimeStamp,
    sampleDuration,
    sampleFrequency,
  );
  expect(result).toEqual(originalValueWithAllZero);
});

// test for fromMilliSectoAge
it('should return undefined if {milliSecTime} is zero or negative number', () => {
  const result = fromMilliSectoAge(0);
  expect(result).toEqual(undefined);
});

it('should return undefined if {milliSecTime} is less than 1 second', () => {
  const result = fromMilliSectoAge(999);
  expect(result).toEqual(undefined);
});

it('should return 1h1s if {milliSecTime} is 3601000', () => {
  const result = fromMilliSectoAge(3601000);
  expect(result).toEqual('1h1s');
});

it('should return 1d1m instead of 1d1m1s or 1d1s', () => {
  const result = fromMilliSectoAge(86461000);
  expect(result).toEqual('1d1m');
});

// Mocking history from react-router to test the URL sync hook
const mockHistoryReplace = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: () => ({
    replace: mockHistoryReplace,
  }),
}));

describe('useTableSortURLSync hook', () => {
  it('should not set anything in the URL if data is not ready', () => {
    renderHook(() => useTableSortURLSync('name', false, []));
    expect(mockHistoryReplace).not.toHaveBeenCalled();
  });

  it('should set a name sorting in the URL', () => {
    renderHook(() => useTableSortURLSync('name', false, ['foo']));
    expect(mockHistoryReplace).toHaveBeenCalledWith('?sort=name');
  });

  it('should set a status sorting in the URL with a desc parameter', () => {
    renderHook(() => useTableSortURLSync('status', true, ['foo']));
    expect(mockHistoryReplace).toHaveBeenCalledWith('?sort=status&desc=true');
  });

  it('should clear the URL params if status goes back to default (health)', () => {
    renderHook(() => useTableSortURLSync('health', false, ['foo']));
    expect(mockHistoryReplace).toHaveBeenCalledWith('?');
  });
});

// the tests of the recommended device path
it('should return next driver', () => {
  const result = linuxDrivesNamingIncrement('/dev/vda', 1);
  expect(result).toEqual('/dev/vdb');
});

it('should return /dev/vdaa after /dev/vdz', () => {
  const result = linuxDrivesNamingIncrement('/dev/vdz', 1);
  expect(result).toEqual('/dev/vdaa');
});

it('should return /dev/vdaa after /dev/vdz', () => {
  const result = linuxDrivesNamingIncrement('/dev/vdaz', 1);
  expect(result).toEqual('/dev/vdba');
});

it('should return the original path if the increment is 0', () => {
  const result = linuxDrivesNamingIncrement('/dev/vdc', 0);
  expect(result).toEqual('/dev/vdc');
});

it('should return an empty string if the driver is not virtualization-aware disk driver', () => {
  const result = linuxDrivesNamingIncrement('/dev/sda', 2);
  expect(result).toEqual('');
});

it('should return an empty string if the device path is empty', () => {
  const result = linuxDrivesNamingIncrement('', 2);
  expect(result).toEqual('');
});

it('should return an empty string if the increment is smaller than 0', () => {
  const result = linuxDrivesNamingIncrement('/dev/vda', -1);
  expect(result).toEqual('');
});
