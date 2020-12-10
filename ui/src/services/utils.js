import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useLocation, useHistory } from 'react-router-dom';
import { createSelector } from 'reselect';
import sortByArray from 'lodash.sortby';
import { intl } from '../translations/IntlGlobalProvider';
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
  return Math.round(bytes / Math.pow(1024, i), 2) + sizes[i];
}

// The rules to compute the volume condition
//  Exclamation: Failed + Unbound
//  Unlink: Ready + Unbound
//  Link: Ready + Bound
export function computeVolumeCondition(status, isBound) {
  if (status === STATUS_FAILED && isBound === intl.translate('no')) {
    return VOLUME_CONDITION_EXCLAMATION;
  } else if (status === STATUS_READY && isBound === intl.translate('no')) {
    return VOLUME_CONDITION_UNLINK;
  } else if (status === STATUS_READY && isBound === intl.translate('yes')) {
    return VOLUME_CONDITION_LINK;
  } else {
    console.error('Unknown volume condition');
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
export const useQuery = () => {
  return new URLSearchParams(useLocation().search);
};

// Convert the Unix Time Stamp to JS Date Object
export const fromUnixTimestampToDate = (date) => {
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

// Adds a space between size value and its unit since the API returns this as a string
export const formatSizeForDisplay = (value) => {
  return value.replace(/^(\d+)(\D+)$/, '$1 $2');
};

/*
 ** Custom hook that stores table sorting choice in the URL queries
 ** Defaults to health sorting (used on Nodes and Volumes tables)
 */
export const useTableSortURLSync = (sorted, desc, data) => {
  const history = useHistory();
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const querySort = query.get('sort');
    const queryDesc = query.get('desc');
    if (data.length && (sorted !== querySort || desc !== queryDesc)) {
      if (sorted) {
        sorted ? query.set('sort', sorted) : query.delete('sort');
        desc ? query.set('desc', desc) : query.delete('desc');
        // Remove the default sorting `sort=health` from the query string
        if (sorted === 'health' && desc === false) {
          query.delete('sort');
          query.delete('desc');
        }
      } else if (!sorted && querySort) {
        query.delete('sort');
        query.delete('desc');
      }
      history.replace(`?${query.toString()}`);
    }
  }, [sorted, desc, data.length, history]);
};

/*
 ** Custom hook to define chart dimension based on their container
 ** This calculates the width for rows of 2 charts
 ** Takes container id as a param and returns [ width, heigth ]
 */
export const useDynamicChartSize = (container_id) => {
  const graphsContainerWidth = document.getElementById(container_id)
    ?.offsetWidth;
  const [graphWidth, setGraphWidth] = useState(0);
  useEffect(() => {
    if (graphsContainerWidth) setGraphWidth(graphsContainerWidth / 2 - 50);
  }, [graphsContainerWidth]);

  return [graphWidth, window.innerHeight / 6 - 30];
};

/**
 * This function increments the string by 1
 *
 * Note that, for the moment, we only support device path '/dev/vda'
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
 * @param {string} string - The string that will be incremented
 *
 * @example
 * const string = '/dev/vda'
 *
 * const nextDevicePath = linuxDrivesNamingIncrement(string)
 */
export const linuxDrivesNamingIncrement = (string, increment) => {
  if (string.match(/^\/dev\/vd[a-z]/)) {
    while (increment--) {
      var lastChar = string.slice(-1);
      var sub = string.slice(0, -1);
      if (lastChar === 'z' && string.lenth === 8) {
        string = '/dev/vdaa';
      } else {
        string = sub + String.fromCharCode(lastChar.charCodeAt() + 1);
      }
    }
    return string;
  } else {
    return '';
  }
};
