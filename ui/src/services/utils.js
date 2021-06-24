import { useEffect, useState, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useLocation, useHistory } from 'react-router-dom';
import { createSelector } from 'reselect';
import sortByArray from 'lodash.sortby';
import {
  STATUS_FAILED,
  STATUS_READY,
  STATUS_UNKNOWN,
  VOLUME_CONDITION_EXCLAMATION,
  VOLUME_CONDITION_UNLINK,
  VOLUME_CONDITION_LINK,
  STATUS_CRITICAL,
  STATUS_WARNING,
  STATUS_NONE,
  STATUS_HEALTH,
} from '../constants';

export function prettifyBytes(bytes, decimals) {
  var units = ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
  var unit = 'B';
  var num = bytes;
  var dec = decimals !== undefined ? Math.pow(10, decimals) : 1;
  var i = 0;

  while (num >= 1024) {
    if (units[i] === undefined) {
      break;
    }
    num = num / 1024;
    unit = units[i];
    i++;
  }

  num = Math.round(num * dec) / dec;

  return {
    value: num + ' ' + unit,
    unit: unit,
    number: num,
  };
}

//memory = '1882148Ki'
export function convertK8sMemoryToBytes(memory) {
  return parseInt(memory.slice(0, -2), 10) * 1024;
}

export const sortSelector = createSelector(
  (list, sortBy, sortDirection) => {
    const sortedList = sortByArray(list, [
      (item) => {
        return typeof item[sortBy] === 'string'
          ? item[sortBy].toLowerCase()
          : item[sortBy];
      },
    ]);

    if (sortDirection === 'DESC') {
      sortedList.reverse();
    }
    return sortedList;
  },
  (list) => list,
);

/**
 * This function will sort the `array` by capacity.
 * The capacity should follow k8s regex rules.
 * Each elements is an object that have a storageCapacity field.
 *
 * @param {array} list - The array that will be sort
 * @param {string} sortBy - The field that will be sort
 * @param {string} sortDirection - The direction of the sort.
 *
 * /!\ This function will override the following fields, please make
 * sure your object does not contain those fields :
 * `tmpInternalSize` and `tmpInternalUnitBase`
 *
 * @example
 * const capacities = [
 *  { capacity: '1Ki' },
 *  { capacity: '1Gi' },
 *  { capacity: '100Mi' },
 * ];
 *
 * const sortedCapacity = sortCapacity(capacities, 'capacity', 'DESC')
 */
export const sortCapacity = createSelector(
  (list = [], sortBy = 'storageCapacity', sortDirection = 'ASC') => {
    if (
      Array.isArray(list) &&
      typeof sortBy === 'string' &&
      typeof sortDirection === 'string'
    ) {
      const sizeRegex = /^(?<size>[1-9][0-9]*)(?<unit>[kKMGTP]i?)?/;
      const notSortableList = list.filter(
        (item) => !sizeRegex.test(item?.[sortBy]),
      );

      const sortedList = list
        // Filter wrong value (ie: null or incorrect unit)
        .filter((item) => sizeRegex.test(item?.[sortBy]))
        .map((item) => {
          /**
           * This regex help us to seperate the capacity into
           * the size and the unit
           * @example
           * "1Gi" => { 'groups': { size: '1', unit: 'Gi'} }
           * "123" => { 'groups': { size: '1', unit: undefined } }
           */
          const { groups } = item[sortBy].match(sizeRegex);
          const tmpInternalUnit = groups?.unit ?? '';
          const tmpInternalSize = groups?.size;
          const tmpInternalUnitBase =
            sizeUnits.find((sizeUnit) => sizeUnit.value === tmpInternalUnit)
              ?.base ?? sizeUnits[0].value;

          return {
            ...item,
            tmpInternalSize,
            tmpInternalUnitBase,
          };
        })
        .sort((item1, item2) => {
          const rawValue1 = item1.tmpInternalUnitBase * item1.tmpInternalSize;
          const rawValue2 = item2.tmpInternalUnitBase * item2.tmpInternalSize;

          if (sortDirection === 'ASC') {
            return rawValue1 - rawValue2;
          } else if (sortDirection === 'DESC') {
            return rawValue2 - rawValue1;
          } else {
            return 0;
          }
        })
        // Cleanup temporary fields
        .map((item) => {
          const cleanItem = { ...item };
          delete cleanItem.tmpInternalSize;
          delete cleanItem.tmpInternalUnitBase;
          return cleanItem;
        });

      return [...sortedList, ...notSortableList];
    } else {
      return [];
    }
  },
  (list) => list,
);

export const getNodeNameFromUrl = (state, props, name) => {
  // Exceptional: don't need to get the name from URL.
  if (name) {
    return name;
  }
  const location = props?.location?.pathname?.split('/')[1];
  if (location === 'volumes') {
    const query = new URLSearchParams(props.location.search);
    const nodeName = query.get('node');
    if (nodeName) {
      return nodeName;
    } else {
      return '';
    }
  }
};

export const getNodes = (state) =>
  (state && state.app && state.app.nodes && state.app.nodes.list) || [];

export const getPods = (state) =>
  (state && state.app && state.app.pods && state.app.pods.list) || [];

export const getVolumes = (state) =>
  (state && state.app && state.app.volumes && state.app.volumes.list) || [];

export const makeGetNodeFromUrl = createSelector(
  getNodeNameFromUrl,
  getNodes,
  (nodeName, nodes) => nodes.find((node) => node.name === nodeName) || {},
);

export const makeGetPodsFromUrl = createSelector(
  getNodeNameFromUrl,
  getPods,
  (nodeName, pods) => pods.filter((pod) => pod.nodeName === nodeName) || [],
);

export const makeGetVolumesFromUrl = createSelector(
  getNodeNameFromUrl,
  getVolumes,
  (nodeName, volumes) =>
    volumes.filter(
      (volume) => volume && volume.spec && volume.spec.nodeName === nodeName,
    ),
);

export const useRefreshEffect = (refreshAction, stopRefreshAction) => {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(refreshAction());
    return () => {
      dispatch(stopRefreshAction());
    };
  }, [dispatch, refreshAction, stopRefreshAction]);
};

export const sizeUnits = [
  { label: 'B', value: '', base: 1 },
  { label: 'KiB', value: 'Ki', base: 2 ** 10 },
  { label: 'MiB', value: 'Mi', base: 2 ** 20 },
  { label: 'GiB', value: 'Gi', base: 2 ** 30 },
  { label: 'TiB', value: 'Ti', base: 2 ** 40 },
  { label: 'PiB', value: 'Pi', base: 2 ** 50 },
  { label: 'k', value: 'k', base: 10 ** 3 },
  { label: 'M', value: 'M', base: 10 ** 6 },
  { label: 'G', value: 'G', base: 10 ** 9 },
  { label: 'T', value: 'T', base: 10 ** 12 },
  { label: 'P', value: 'P', base: 10 ** 15 },
];

export function allSizeUnitsToBytes(size) {
  if (size) {
    const sizeRegex = /^(?<size>[1-9][0-9]*)(?<unit>[kKMGTP]i?)?/;
    const { groups } = size?.match(sizeRegex);

    if (groups) {
      const tmpInternalUnit = groups?.unit ?? '';
      const tmpInternalSize = groups?.size;
      const tmpInternalUnitBase =
        sizeUnits.find((sizeUnit) => sizeUnit.value === tmpInternalUnit)
          ?.base ?? sizeUnits[0].value;

      return tmpInternalUnitBase * tmpInternalSize;
    }
  }
}

export function bytesToSize(bytes) {
  let sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'];
  if (bytes === 0) return '0 Byte';
  let i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
}

// The rules to compute the volume condition
//  Exclamation: Failed + Unbound
//  Unlink: Ready + Unbound
//  Link: Ready + Bound
export function computeVolumeCondition(status, isBound) {
  if (status === STATUS_FAILED && !isBound) {
    return VOLUME_CONDITION_EXCLAMATION;
  } else if (status === STATUS_READY && !isBound) {
    return VOLUME_CONDITION_UNLINK;
  } else if (status === STATUS_READY && isBound) {
    return VOLUME_CONDITION_LINK;
  } else {
    return STATUS_UNKNOWN;
  }
}

/**
 * This function manually adds the missing data points with `null` value caused by downtime of the VMs
 *
 * @param {array} orginalValues - The array of the data points are already sorted according to the time series
 * @param {number} startingTimeStamp - The starting timestamp
 * @param {number} sampleDuration - The time span value in seconds
 * @param {number} sampleFrequency - The time difference between two data points in seconds
 *
 */
export function addMissingDataPoint(
  orginalValues,
  startingTimeStamp,
  sampleDuration,
  sampleFrequency,
) {
  if (
    !orginalValues ||
    orginalValues.length === 0 ||
    startingTimeStamp === undefined ||
    !sampleDuration ||
    !sampleFrequency ||
    startingTimeStamp < 0 ||
    sampleDuration <= 0 ||
    sampleFrequency <= 0
  ) {
    return [];
  }

  const newValues = [];
  const numberOfDataPoints = sampleDuration / sampleFrequency;
  let samplingPointTime = startingTimeStamp;

  // initialize the array with all `null` value
  for (let i = 0; i < numberOfDataPoints; i++) {
    newValues.push([samplingPointTime, null]);
    samplingPointTime += sampleFrequency;
  }

  // copy the existing data points from `orginalValue` array to `newValues`
  if (newValues.length === 0) return;
  let nextIndex = 0;
  for (let i = 0; i < newValues.length; i++) {
    if (
      orginalValues[nextIndex] &&
      newValues[i][0] === orginalValues[nextIndex][0]
    ) {
      newValues[i][1] = orginalValues[nextIndex][1];
      nextIndex++;
    }
  }
  return newValues;
}

// A custom hook that builds on useLocation to parse the query string.
export const useURLQuery = () => {
  return new URLSearchParams(useLocation().search);
};

// Convert the Unix Time Stamp to JS Date Object
export const fromUnixTimestampToDate = (date): Date => {
  if (date) {
    return new Date(date * 1000);
  }
};

// Convert the timestamp from milliseconds to Age.
// For example: 1h1s, 1d1h, 1d1s, 1d
export const fromMilliSectoAge = (milliSecTime) => {
  if (milliSecTime >= 1000) {
    let day, hour, minute, second;
    const age = [];

    second = Math.floor(milliSecTime / 1000);
    minute = Math.floor(second / 60);
    hour = Math.floor(minute / 60);
    day = Math.floor(hour / 24);

    second = second % 60;
    minute = minute % 60;
    hour = hour % 24;

    if (day > 0) {
      age.push(day + 'd');
    }
    if (hour > 0) {
      age.push(hour + 'h');
    }
    if (minute > 0) {
      age.push(minute + 'm');
    }
    if (second > 0) {
      age.push(second + 's');
    }
    return age.slice(0, 2).join('');
  }
};

// Status comparison logic used to sort Items based on health (critical first)
export const compareHealth = (status1, status2) => {
  const weights = {};
  weights[STATUS_CRITICAL] = 3;
  weights[STATUS_WARNING] = 2;
  weights[STATUS_NONE] = 1;
  weights[STATUS_HEALTH] = 0;

  return weights[status1] - weights[status2];
};

// Add a space between size value and its unit since the API returns this as a string
// Add the unit B
export const formatSizeForDisplay = (value) => {
  if (value.match(/^(\d+)(\D+)$/))
    return value.replace(/^(\d+)(\D+)$/, '$1 $2') + 'B';
  else return value;
};

/**
 * Custom hook that stores table sorting choice in the URL queries
 *
 * @param {string} sorted
 * @param {boolean} desc
 * @param {array} data
 * @param {string} defaultSortKey default sorting key
 */
export const useTableSortURLSync = (sorted, desc, data, defaultSortKey) => {
  const history = useHistory();
  const location = useLocation();
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const querySort = query.get('sort');
    const queryDesc = query.get('desc');
    if (data.length && (sorted !== querySort || desc !== queryDesc)) {
      if (sorted) {
        sorted ? query.set('sort', sorted) : query.delete('sort');
        desc ? query.set('desc', desc) : query.delete('desc');
        // if the current sorting is the default sorting, remove the query parameter
        if (sorted === defaultSortKey && desc === false) {
          query.delete('sort');
          query.delete('desc');
        }
      } else if (!sorted && querySort) {
        query.delete('sort');
        query.delete('desc');
      }

      // We replace the current url only if expected current query params are different
      // than the expected one. This avoid triggering redirection loop if one of consumer
      // of this hooks get frequently renderred.
      if (
        query.toString() !== new URLSearchParams(location.search).toString()
      ) {
        history.replace(`?${query.toString()}`);
      }
    }
  }, [sorted, desc, data.length, history, location, defaultSortKey]);
};

/*
 ** Custom hook to define chart dimension based on their container
 ** By default this calculates the width for 3 rows of 2 charts
 ** Takes container id as a param and optionnally desired number of columns and row and returns [ width, heigth ]
 */
export const useDynamicChartSize = (
  container_id: string,
  columns: number = 2,
  rows: number = 3,
): [number, number] => {
  const graphsContainerWidth =
    document.getElementById(container_id)?.offsetWidth;
  const [graphWidth, setGraphWidth] = useState(0);
  useEffect(() => {
    if (graphsContainerWidth) {
      if (columns === 1) setGraphWidth(graphsContainerWidth - 45);
      else setGraphWidth(graphsContainerWidth / columns - 50);
    }
  }, [graphsContainerWidth, columns]);

  return [graphWidth, window.innerHeight / (rows * 2) - 50];
};

/*
 ** Hook to store previous value of a given variable
 ** Used to compare prev and next props or equivalent
 */
export const usePrevious = (value) => {
  const ref = useRef();
  // Store current value in ref
  useEffect(() => {
    ref.current = value;
  }, [value]); // Only re-run if value changes
  return ref.current;
};

/**
 * This function provides the name of the next nth drive name of virtualization-aware disk driver, used by batch volume creation.
 *
 * Note that:
 * the recommended device path only happens with '/dev/vda'. We maybe want to support more kinds of disk drivers depends on the users' needs.
 *
 * Drive # —	Name
 * 1	        vda
 * 26	        vdz
 * 27	        vdaa
 * 28	        vdab
 * 52	        vdaz
 * 53	        vdba
 * 54	        vdbb
 * 702	      vdzz
 * 703	      vdaaa
 * 704	      vdaab
 * 18278	    vdzzz
 *
 * @param {string} devicePath - The device path of the virtualization-aware disk driver.
 * @param {number} increment  - The number of drive to increase compare to the targe the drive.
 *
 * @example
 * const devicePath = '/dev/vda'
 *
 * const nextDevicePath = linuxDrivesNamingIncrement(devicePath, 2)
 */
export const linuxDrivesNamingIncrement = (devicePath, increment) => {
  if (devicePath.match(/^\/dev\/vd[a-z]/) && increment >= 1) {
    while (increment--) {
      const lastChar = devicePath.slice(-1);
      const sub = devicePath.slice(0, -1);

      if (lastChar === 'z' && devicePath.length === 8) {
        devicePath = '/dev/vdaa';
      } else if (lastChar === 'z' && devicePath.length === 9) {
        // when the path is `/dev/vdaz`, `/dev/vdbz`,
        const last2ndChar = devicePath.slice(-2);
        const subBefore = devicePath.slice(0, -2);
        devicePath =
          subBefore + String.fromCharCode(last2ndChar.charCodeAt() + 1) + 'a';
      } else {
        devicePath = sub + String.fromCharCode(lastChar.charCodeAt() + 1);
      }
    }
    return devicePath;
  } else if (devicePath.match(/^\/dev\/vd[a-z]/) && increment === 0) {
    return devicePath;
  } else {
    return '';
  }
};

/*
Following the design system, we should have 6 types of date.
| Alias   | code                     | Example                  | Length | Context                                                |
| ------- | ------------------------ | ------------------------ | ------ | ------------------------------------------------------ |
| Short#1 | DD MMM                   | 20 Jul                   | 5      | Chart time axis                                        |
| Short#2 | DDMMM HH:mm              | 20Jul 09:00              | 11     | Limited space, year not needed                         |
| Short#3 | YYYY-MM-DD               | 2020-07-20               | 10     | Tables                                                 |
| Mid#1   | YYYY-MM-DD HH:mm         | 2020-07-20 09:00         | 16     | Tables (creation/modification dates)                   |
| Mid#2   | YYYY-MM-DD HH:mm:ss      | 2020-07-20 09:00:00      | 19     | When the seconds are needed                            |
| Full#1  | EEE MMM DD YYYY HH:mm:ss | Mon Jul 20 2020 09:00:00 | 24     | When a lot of space (hover) - When precision is needed |
*/
export const formatDateToMid1 = (isoDate: string): string => {
  const date = new Date(isoDate);
  /*
  Year: 4-digit year.
  Month: Month of the year (0-11). Month is zero-indexed.
  Day: Day of the month (1-31).
  Hour: Hour of the day (0-23).
  Minutes: Minutes (0-59).
  Seconds: Seconds (0-59).
*/
  const year = date.getFullYear();
  const month = (date.getMonth() + 1 < 10 ? '0' : '') + (date.getMonth() + 1);
  const day = (date.getDate() < 10 ? '0' : '') + date.getDate();
  const hour = (date.getHours() < 10 ? '0' : '') + date.getHours();
  const minute = (date.getMinutes() < 10 ? '0' : '') + date.getMinutes();
  return `${year}-${month}-${day} ${hour}:${minute}`;
};
