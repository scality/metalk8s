import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { createSelector } from 'reselect';
import { sortBy as sortByArray } from 'lodash';

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
    number: num
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
      }
    ]);

    if (sortDirection === 'DESC') {
      sortedList.reverse();
    }
    return sortedList;
  },
  list => list
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
  (nodeName, nodes) => nodes.find(node => node.name === nodeName) || {}
);

export const makeGetPodsFromUrl = createSelector(
  getNodeNameFromUrl,
  getPods,
  (nodeName, pods) => pods.filter(pod => pod.nodeName === nodeName) || []
);

export const makeGetVolumesFromUrl = createSelector(
  getNodeNameFromUrl,
  getVolumes,
  (nodeName, volumes) =>
    volumes.filter(
      volume => volume && volume.spec && volume.spec.nodeName === nodeName
    )
);

export const useRefreshEffect = (refreshAction, stopRefreshAction) => {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(refreshAction());
    return () => {
      dispatch(stopRefreshAction());
    };
  }, []);
};
