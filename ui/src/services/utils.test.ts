import { NAN_STRING } from '@scality/core-ui/dist/components/constants';
import { renderHook } from '@testing-library/react-hooks';
import { STATUS_CRITICAL, STATUS_HEALTH, STATUS_WARNING } from '../constants';
import {
  fromMilliSectoAge,
  useTableSortURLSync,
  linuxDrivesNamingIncrement,
  getSegments,
  getNaNSegments,
  allSizeUnitsToBytes,
} from './utils';
describe('allSizeUnitsToBytes', () => {
  it('should convert B to B', () => {
    expect(allSizeUnitsToBytes('988 B')).toBe(988);
    expect(allSizeUnitsToBytes('988')).toBe(988);
  });
  it('should convert kiB to B', () => {
    expect(allSizeUnitsToBytes('988.5 KiB')).toBe(988.5 * 1024);
    expect(allSizeUnitsToBytes('988.5KiB')).toBe(988.5 * 1024);
    expect(allSizeUnitsToBytes('988.5 KB')).toBe(988.5 * 10 ** 3);
  });
  it('should convert MiB to B', () => {
    expect(allSizeUnitsToBytes('9 MiB')).toBe(9 * 1024 ** 2);
    expect(allSizeUnitsToBytes('98MiB')).toBe(98 * 1024 ** 2);
    expect(allSizeUnitsToBytes('98.88 MB')).toBe(98.88 * 10 ** 6);
  });
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
    // @ts-expect-error - FIXME when you are working on it
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

describe('getNaNSegments', () => {
  it('should return 0 segments when no points are missing', () => {
    //S
    const segments = [
      [0, 1],
      [1, 2],
    ];
    //E
    // @ts-expect-error - FIXME when you are working on it
    const nullSegments = getNaNSegments(segments);
    //V
    expect(nullSegments).toHaveLength(0);
  });
  it('should return 0 segments when given array is empty', () => {
    //S
    const segments = [];
    //E
    // @ts-expect-error - FIXME when you are working on it
    const nullSegments = getNaNSegments(segments);
    //V
    expect(nullSegments).toHaveLength(0);
  });
  it('should return 0 segments when given array is falsy', () => {
    //S
    const segments = null;
    //E
    const nullSegments = getNaNSegments(segments);
    //V
    expect(nullSegments).toHaveLength(0);
  });
  it('should throw when given array is invalid', () => {
    //S
    const segments = [
      {
        hello: 'world',
      },
      null,
    ];
    //E + V
    // @ts-expect-error - FIXME when you are working on it
    expect(() => getNaNSegments(segments)).toThrow();
  });
  it('should return 1 segment when given array contains one null point in the middle', () => {
    //S
    const segments = [
      [1, 1],
      [2, 2],
      [3, NAN_STRING],
      [4, 2],
    ];
    //E
    // @ts-expect-error - FIXME when you are working on it
    const nullSegments = getNaNSegments(segments);
    //V
    expect(nullSegments).toHaveLength(1);
    expect(nullSegments).toContainEqual({
      startsAt: 3,
      endsAt: 4,
    });
  });
  it('should return 1 segment when given array contains null points in the beginning', () => {
    //S
    const segments = [
      [1, NAN_STRING],
      [2, NAN_STRING],
      [3, 1],
      [4, 2],
    ];
    //E
    // @ts-expect-error - FIXME when you are working on it
    const nullSegments = getNaNSegments(segments);
    //V
    expect(nullSegments).toHaveLength(1);
    expect(nullSegments).toContainEqual({
      startsAt: 1,
      endsAt: 3,
    });
  });
  it('should return 1 segment when given array contains null points in the end', () => {
    //S
    const segments = [
      [1, NAN_STRING],
      [2, NAN_STRING],
      [3, NAN_STRING],
      [4, NAN_STRING],
    ];
    //E
    // @ts-expect-error - FIXME when you are working on it
    const nullSegments = getNaNSegments(segments);
    //V
    expect(nullSegments).toHaveLength(1);
    expect(nullSegments).toContainEqual({
      startsAt: 1,
      endsAt: null,
    });
  });
  it('should return several segments when given array contains multiple null points', () => {
    //S
    const segments = [
      [1, NAN_STRING],
      [2, NAN_STRING],
      [3, 1],
      [4, NAN_STRING],
    ];
    //E
    // @ts-expect-error - FIXME when you are working on it
    const nullSegments = getNaNSegments(segments);
    //V
    expect(nullSegments).toHaveLength(2);
    expect(nullSegments).toStrictEqual([
      {
        startsAt: 1,
        endsAt: 3,
      },
      {
        startsAt: 4,
        endsAt: null,
      },
    ]);
  });
});
describe('getSegments', () => {
  const cases = [
    {
      name: 'Danger, NaN and At risk cases overlapping',
      pointsWatchdog: [
        [1, '1'],
        [2, '1'],
        [3, '1'],
        [4, '1'],
        [5, NAN_STRING],
        [6, '1'],
      ],
      pointsDegraded: [
        [1, '1'],
        [2, '1'],
        [3, '1'],
        [4, '1'],
        [5, NAN_STRING],
        [6, '1'],
      ],
      pointsAtRisk: [
        [1, '0'],
        [2, '0'],
        [3, '1'],
        [4, '1'],
        [5, NAN_STRING],
        [6, '0'],
      ],
      expected: [
        {
          startsAt: 1,
          endsAt: 3,
          type: STATUS_WARNING,
        },
        {
          startsAt: 3,
          endsAt: 5,
          type: STATUS_CRITICAL,
        },
        {
          startsAt: 5,
          endsAt: 6,
          type: NAN_STRING,
        },
        {
          startsAt: 6,
          endsAt: null,
          type: STATUS_WARNING,
        },
      ],
    },
    {
      name: 'Healthy and NaN overlapping',
      pointsWatchdog: [
        [1, '1'],
        [2, '1'],
        [3, '1'],
        [4, '1'],
        [5, NAN_STRING],
        [6, '1'],
      ],
      pointsDegraded: [
        [1, NAN_STRING],
        [2, NAN_STRING],
        [3, NAN_STRING],
        [4, NAN_STRING],
        [5, NAN_STRING],
        [6, NAN_STRING],
      ],
      pointsAtRisk: [
        [1, NAN_STRING],
        [2, NAN_STRING],
        [3, NAN_STRING],
        [4, NAN_STRING],
        [5, NAN_STRING],
        [6, NAN_STRING],
      ],
      expected: [
        {
          startsAt: 1,
          endsAt: 5,
          type: STATUS_HEALTH,
        },
        {
          startsAt: 5,
          endsAt: 6,
          type: NAN_STRING,
        },
        {
          startsAt: 6,
          endsAt: null,
          type: STATUS_HEALTH,
        },
      ],
    },
    {
      name: 'Healthy',
      pointsWatchdog: [
        [1, '1'],
        [2, '1'],
        [3, '1'],
        [4, '1'],
        [5, '1'],
        [6, '1'],
      ],
      pointsDegraded: [
        [1, NAN_STRING],
        [2, NAN_STRING],
        [3, NAN_STRING],
        [4, NAN_STRING],
        [5, NAN_STRING],
        [6, NAN_STRING],
      ],
      pointsAtRisk: [
        [1, NAN_STRING],
        [2, NAN_STRING],
        [3, NAN_STRING],
        [4, NAN_STRING],
        [5, NAN_STRING],
        [6, NAN_STRING],
      ],
      expected: [
        {
          startsAt: 1,
          endsAt: null,
          type: STATUS_HEALTH,
        },
      ],
    },
    {
      name: 'In danger',
      pointsWatchdog: [
        [1, '1'],
        [2, '1'],
        [3, '1'],
        [4, '1'],
        [5, '1'],
        [6, '1'],
      ],
      pointsDegraded: [
        [1, '1'],
        [2, '1'],
        [3, '1'],
        [4, '1'],
        [5, '1'],
        [6, '1'],
      ],
      pointsAtRisk: [
        [1, '0'],
        [2, '0'],
        [3, '0'],
        [4, '0'],
        [5, '0'],
        [6, '0'],
      ],
      expected: [
        {
          startsAt: 1,
          endsAt: null,
          type: STATUS_WARNING,
        },
      ],
    },
    {
      name: 'At risk',
      pointsWatchdog: [
        [1, '1'],
        [2, '1'],
        [3, '1'],
        [4, '1'],
        [5, '1'],
        [6, '1'],
      ],
      pointsDegraded: [
        [1, '0'],
        [2, '0'],
        [3, '0'],
        [4, '0'],
        [5, '0'],
        [6, '0'],
      ],
      pointsAtRisk: [
        [1, '1'],
        [2, '1'],
        [3, '1'],
        [4, '1'],
        [5, '1'],
        [6, '1'],
      ],
      expected: [
        {
          startsAt: 1,
          endsAt: null,
          type: STATUS_CRITICAL,
        },
      ],
    },
    {
      name: 'Danger unavailable',
      pointsWatchdog: [
        [1, '1'],
        [2, '1'],
        [3, '1'],
        [4, '1'],
        [5, '1'],
        [6, '1'],
      ],
      pointsDegraded: [
        [1, NAN_STRING],
        [2, NAN_STRING],
        [3, NAN_STRING],
        [4, NAN_STRING],
        [5, NAN_STRING],
        [6, NAN_STRING],
      ],
      pointsAtRisk: [
        [1, '1'],
        [2, '1'],
        [3, '1'],
        [4, '1'],
        [5, '1'],
        [6, '1'],
      ],
      expected: [
        {
          startsAt: 1,
          endsAt: null,
          type: STATUS_CRITICAL,
        },
      ],
    },
    {
      name: 'At risk unavailable',
      pointsWatchdog: [
        [1, '1'],
        [2, '1'],
        [3, '1'],
        [4, '1'],
        [5, '1'],
        [6, '1'],
      ],
      pointsDegraded: [
        [1, '1'],
        [2, '1'],
        [3, '1'],
        [4, '1'],
        [5, '1'],
        [6, '1'],
      ],
      pointsAtRisk: [
        [1, NAN_STRING],
        [2, NAN_STRING],
        [3, NAN_STRING],
        [4, NAN_STRING],
        [5, NAN_STRING],
        [6, NAN_STRING],
      ],
      expected: [
        {
          startsAt: 1,
          endsAt: null,
          type: STATUS_WARNING,
        },
      ],
    },
  ];
  cases.forEach(
    ({ name, pointsAtRisk, pointsDegraded, pointsWatchdog, expected }) => {
      test(`Given ${name} points should be converted to the expected alert segments`, () => {
        const result = getSegments({
          pointsDegraded,
          pointsAtRisk,
          pointsWatchdog,
        });
        expect(result).toStrictEqual(expected);
      });
    },
  );
});
