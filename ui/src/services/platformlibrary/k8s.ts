import { useQuery } from 'react-query';
import { REFRESH_METRICS_GRAPH } from '../../constants';
import * as Metalk8sVolumesApi from '../k8s/Metalk8sVolumeClient.generated';
import * as VolumesApi from '../k8s/volumes';
import { allSizeUnitsToBytes, bytesToSize } from '../utils';
const FIVE_SECOND_IN_MS = 5000;
export const volumesKey = {
  all: ['volumes', 'list'],
  volumeObject: (volumeName) => ['volumes', 'object', volumeName],
  persitant: ['persistentVolumes'],
};
export const getNodesCountQuery = (
  k8sUrl: string,
  token?: string | null,
): typeof useQuery => {
  return {
    queryKey: 'countNodes',
    queryFn: () =>
      fetch(`${k8sUrl}/api/v1/nodes`, {
        headers: {
          authorization: `bearer ${token}`,
        },
      })
        .then((r) => {
          if (r.ok) {
            return r.json();
          }
        })
        .then((res) => {
          return res.items.length;
        }),
    refetchInterval: REFRESH_METRICS_GRAPH,
    enabled: token ? true : false,
  };
};
export const getVolumesCountQuery = (
  k8sUrl: string,
  token?: string | null,
): typeof useQuery => {
  return {
    queryKey: 'countVolumes',
    queryFn: () =>
      fetch(`${k8sUrl}/api/v1/persistentvolumes`, {
        headers: {
          authorization: `bearer ${token}`,
        },
      })
        .then((r) => {
          if (r.ok) {
            return r.json();
          }
        })
        .then((res) => {
          return res.items.length;
        }),
    refetchInterval: REFRESH_METRICS_GRAPH,
    enabled: token ? true : false,
  };
};
export function getVolumeQueryOption() {
  return {
    queryKey: volumesKey.all,
    queryFn: Metalk8sVolumesApi.getMetalk8sV1alpha1VolumeList,
    select: (data) => data.body?.items,
    staleTime: FIVE_SECOND_IN_MS,
  };
}
export function getCurrentVolumeObjectQueryOption(volumeName: string) {
  return {
    queryKey: volumesKey.volumeObject(volumeName),
    select: (data) => data.body,
    queryFn: () => Metalk8sVolumesApi.getMetalk8sV1alpha1Volume(volumeName),
  };
}
export function getPersistentVolumeQueryOption() {
  return {
    queryKey: volumesKey.persitant,
    queryFn: VolumesApi.getPersistentVolumes,
    select: (data) => {
      return data.body?.items?.map((item) => {
        return {
          ...item,
          spec: {
            ...item.spec,
            capacity: {
              storage: bytesToSize(
                allSizeUnitsToBytes(item.spec.capacity.storage),
              ),
            },
          },
        };
      });
    },
    staleTime: FIVE_SECOND_IN_MS,
  };
}
