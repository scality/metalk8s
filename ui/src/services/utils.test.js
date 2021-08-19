import { renderHook } from '@testing-library/react-hooks';
import {
  sortCapacity,
  fromMilliSectoAge,
  useTableSortURLSync,
  linuxDrivesNamingIncrement,
  formatDateToMid1,
  getNullSegments,
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
jest.mock('react-router-dom', () => {
  let location = new URL('http://test.test');
  return {
    ...jest.requireActual('react-router-dom'),
    useHistory: () => ({
      replace: (newLocation) => {
        location = new URL('http://test.test' + newLocation);
        mockHistoryReplace(newLocation);
      },
    }),
    useLocation: () => location,
  };
});

describe('useTableSortURLSync hook', () => {
  it('should not set anything in the URL if data is not ready', () => {
    renderHook(() => useTableSortURLSync('name', false, [], 'key'));
    expect(mockHistoryReplace).not.toHaveBeenCalled();
  });

  it('should set a name sorting in the URL', () => {
    renderHook(() => useTableSortURLSync('name', false, ['foo'], 'key'));
    expect(mockHistoryReplace).toHaveBeenCalledWith('?sort=name');
  });

  it('should set a status sorting in the URL with a desc parameter', () => {
    renderHook(() => useTableSortURLSync('status', true, ['foo']), 'key');
    expect(mockHistoryReplace).toHaveBeenCalledWith('?sort=status&desc=true');
  });

  it('should clear the URL params if status goes back to default (health)', () => {
    let status = 'status';
    const { rerender } = renderHook((props) => {
      return useTableSortURLSync(status, false, ['foo'], 'health');
    });
    expect(mockHistoryReplace).toHaveBeenCalledWith('?sort=status');
    status = 'health';
    rerender();
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

it('should return the formatted local time', () => {
  // mock a local time
  jest
    .spyOn(global.Date, 'now')
    .mockImplementationOnce(() =>
      new Date('2019-05-14T11:01:58.135').valueOf(),
    );
  const result = formatDateToMid1(Date.now());
  expect(result).toEqual('2019-05-14 11:01');
});

it('should return 00:00', () => {
  jest
    .spyOn(global.Date, 'now')
    .mockImplementationOnce(() =>
      new Date('2019-05-14T00:00:58.135').valueOf(),
    );
  const result = formatDateToMid1(Date.now());
  expect(result).toEqual('2019-05-14 00:00');
});

describe('getNullSegments', () => {
  it('should return 0 segments when no points are missing', () => {
    //S
    const segments = [
      [0, 1],
      [1, 2],
    ];
    //E
    const nullSegments = getNullSegments(segments);
    //V
    expect(nullSegments).toHaveLength(0);
  });

  it('should return 0 segments when given array is empty', () => {
    //S
    const segments = [];
    //E
    const nullSegments = getNullSegments(segments);
    //V
    expect(nullSegments).toHaveLength(0);
  });

  it('should return 0 segments when given array is falsy', () => {
    //S
    const segments = null;
    //E
    const nullSegments = getNullSegments(segments);
    //V
    expect(nullSegments).toHaveLength(0);
  });

  it('should throw when given array is invalid', () => {
    //S
    const segments = [{ hello: 'world' }, null];
    //E + V
    expect(() => getNullSegments(segments)).toThrow();
  });

  it('should return 1 segment when given array contains one null point in the middle', () => {
    //S
    const segments = [
      [1, 1],
      [2, 2],
      [3, null],
      [4, 2],
    ];
    //E
    const nullSegments = getNullSegments(segments);
    //V
    expect(nullSegments).toHaveLength(1);
    expect(nullSegments).toContainEqual({ startsAt: 3, endsAt: 4 });
  });

  it('should return 1 segment when given array contains null points in the beginning', () => {
    //S
    const segments = [
      [1, null],
      [2, null],
      [3, 1],
      [4, 2],
    ];
    //E
    const nullSegments = getNullSegments(segments);
    //V
    expect(nullSegments).toHaveLength(1);
    expect(nullSegments).toContainEqual({ startsAt: 1, endsAt: 3 });
  });

  it('should return 1 segment when given array contains null points in the end', () => {
    //S
    const segments = [
      [1, null],
      [2, null],
      [3, null],
      [4, null],
    ];
    //E
    const nullSegments = getNullSegments(segments);
    //V
    expect(nullSegments).toHaveLength(1);
    expect(nullSegments).toContainEqual({ startsAt: 1, endsAt: null });
  });

  it('should return several segments when given array contains multiple null points', () => {
    //S
    const segments = [
      [1, null],
      [2, null],
      [3, 1],
      [4, null],
    ];
    //E
    const nullSegments = getNullSegments(segments);
    //V
    expect(nullSegments).toHaveLength(2);
    expect(nullSegments).toStrictEqual([
      { startsAt: 1, endsAt: 3 },
      { startsAt: 4, endsAt: null },
    ]);
  });
});
