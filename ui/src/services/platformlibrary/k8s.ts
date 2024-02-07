import { useQuery } from 'react-query';
import { REFRESH_METRICS_GRAPH } from '../../constants';
import { allSizeUnitsToBytes, bytesToSize } from '../utils';
import { useK8sApiConfig } from '../k8s/api';
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
    // @ts-expect-error - FIXME when you are working on it
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
    // @ts-expect-error - FIXME when you are working on it
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
export function useGetVolumeQueryOption() {
  const { customObjectsApi } = useK8sApiConfig();
  return {
    queryKey: volumesKey.all,
    queryFn: () => customObjectsApi.getMetalk8sV1alpha1VolumeList(),
    select: (data) => data.body?.items,
    staleTime: FIVE_SECOND_IN_MS,
    enable: !!customObjectsApi,
  };
}
export function useGetCurrentVolumeObjectQueryOption(volumeName: string) {
  const { customObjectsApi } = useK8sApiConfig();
  return {
    queryKey: volumesKey.volumeObject(volumeName),
    select: (data) => data.body,
    queryFn: () => customObjectsApi.getMetalk8sV1alpha1Volume(volumeName),
    enable: !!customObjectsApi,
  };
}
export function useGetPersistentVolumeQueryOption() {
  const { coreV1 } = useK8sApiConfig();
  return {
    queryKey: volumesKey.persitant,
    queryFn: () => coreV1.listPersistentVolume(),
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
    enable: !!coreV1,
  };
}
