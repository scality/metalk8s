import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
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

export const getNodeNameFromUrl = (state, props) => {
  // There are two different URLs which we want to extract the node name from
  // `/nodes/<node-name>`
  // `/volumes/?node=<node-name>`
  const location = props.location.pathname.split('/')[1];

  if (location === 'volumes') {
    const query = new URLSearchParams(props.location.search);
    const nodeName = query.get('node');
    if (nodeName) {
      return nodeName;
    } else {
      return '';
    }
  } else if (location === 'nodes') {
    if (props && props.match && props.match.params && props.match.params.id) {
      return props.match.params.id;
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

export function formatDate(date) {
  let d = new Date(date),
    month = '' + (d.getMonth() + 1),
    day = '' + d.getDate(),
    year = d.getFullYear();

  if (month.length < 2) month = '0' + month;
  if (day.length < 2) day = '0' + day;

  return [year, month, day].join('-');
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
 * This function combines the values in different pods caused by the restart
 *
 * @param {array} result - The array of the data points are already sorted according to the time series
 *
 */
export function jointDataPointBaseonTimeSeries(result) {
  let values = [];
  if (result) {
    for (const timeseries of result) {
      if (values.length === 0) {
        values = values.concat(timeseries.values);
      } else if (timeseries.values[0][0] > values[0][0]) {
        values.concat(timeseries.values);
      } else if (timeseries.values[0][0] < values[0][0]) {
        timeseries.values.concat(values);
      }
    }

    return values;
  }
}

/**
 * This function manually adds the missing data points with `null` value caused by downtime of the VMs
 *
 * @param {array} orginalValues - The array of the data points are already sorted according to the time series
 * @param {object} startingTime - The starting time
 * @param {number} duration - The timespan value in days
 * @param {number} samplingFrequency - The time difference between two data point (in hour)
 *
 */
export function addMissingDataPoint(
  orginalValues,
  startingTime,
  duration,
  samplingFrequency,
) {
  if (!orginalValues || orginalValues.length === 0 || duration === 0) {
    return;
  }
  const newValues = [];
  const numberOfDataPoints = (duration * 24) / samplingFrequency;
  let samplingPointTime;
  if (startingTime) {
    samplingPointTime = startingTime.getTime() / 1000; //time converted to Unix seconds
  }

  // initialize the array with all `null` value
  for (let i = 0; i < numberOfDataPoints; i++) {
    newValues.push([samplingPointTime, null]);
    samplingPointTime += 3600;
  }

  // copy the existing data points from `orginalValue` array to `newValues`
  if (newValues.length === 0) return;
  let nextIndex = 0;
  for (let i = 0; i < newValues.length; i++) {
    if (newValues[i][0] === orginalValues[nextIndex][0]) {
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
