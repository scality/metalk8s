import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { createSelector } from 'reselect';
import sortByArray from 'lodash.sortby';

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
      item => {
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
  list => list,
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
        item => !sizeRegex.test(item?.[sortBy]),
      );

      const sortedList = list
        // Filter wrong value (ie: null or incorrect unit)
        .filter(item => sizeRegex.test(item?.[sortBy]))
        .map(item => {
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
            sizeUnits.find(sizeUnit => sizeUnit.value === tmpInternalUnit)
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
        .map(item => {
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
  list => list,
);

export const getNodeNameFromUrl = (state, props) => {
  if (props && props.match && props.match.params && props.match.params.id) {
    return props.match.params.id;
  } else {
    return '';
  }
};

export const getNodes = state =>
  (state && state.app && state.app.nodes && state.app.nodes.list) || [];

export const getPods = state =>
  (state && state.app && state.app.pods && state.app.pods.list) || [];

export const getVolumes = state =>
  (state && state.app && state.app.volumes && state.app.volumes.list) || [];

export const makeGetNodeFromUrl = createSelector(
  getNodeNameFromUrl,
  getNodes,
  (nodeName, nodes) => nodes.find(node => node.name === nodeName) || {},
);

export const makeGetPodsFromUrl = createSelector(
  getNodeNameFromUrl,
  getPods,
  (nodeName, pods) => pods.filter(pod => pod.nodeName === nodeName) || [],
);

export const makeGetVolumesFromUrl = createSelector(
  getNodeNameFromUrl,
  getVolumes,
  (nodeName, volumes) =>
    volumes.filter(
      volume => volume && volume.spec && volume.spec.nodeName === nodeName,
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
