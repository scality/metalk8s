import { useEffect } from 'react';
import { useQuery } from 'react-query';
import { useDispatch } from 'react-redux';

import * as Metalk8sVolumesApi from '../../services/k8s/Metalk8sVolumeClient.generated';
import * as VolumesApi from '../../services/k8s/volumes';
import { volumesKey } from '../../services/k8s/volumes.key';
import { allSizeUnitsToBytes, bytesToSize } from '../../services/utils';
import {
  setVolumesAction,
  setCurrentVolumeObjectAction,
  setPersistentVolumesAction,
} from './volumes';
import { REFRESH_TIMEOUT } from '../../constants';

const FIVE_SECOND_IN_MS = 5000;

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
    queryKey: volumesKey.volumeObject,
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

export function useRefreshVolume() {
  const dispatch = useDispatch();
  const result = useQuery({
    ...getVolumeQueryOption(),
    refetchInterval: REFRESH_TIMEOUT,
  });

  const { data } = result;

  useEffect(() => {
    if (data) {
      dispatch(setVolumesAction(data));
    }
  }, [data, dispatch]);

  return result;
}

export function useFetchCurrentVolumeObject(volumeName: string) {
  const dispatch = useDispatch();
  const result = useQuery({ ...getCurrentVolumeObjectQueryOption(volumeName) });

  const { data } = result;

  useEffect(() => {
    if (data) {
      dispatch(setCurrentVolumeObjectAction(data ? { data } : null));
    }
  }, [data, dispatch]);

  return result;
}

export function useGetPersistentVolumes() {
  const dispatch = useDispatch();

  const result = useQuery({
    ...getPersistentVolumeQueryOption(),
    refetchInterval: REFRESH_TIMEOUT,
  });

  const { data } = result;

  useEffect(() => {
    if (data) {
      dispatch(setPersistentVolumesAction(data ?? []));
    }
  }, [data, dispatch]);

  return result;
}
