import { useEffect } from 'react';
import { useQuery } from 'react-query';
import { useDispatch } from 'react-redux';

import * as Metalk8sVolumesApi from '../../services/k8s/Metalk8sVolumeClient.generated';
import * as VolumesApi from '../../services/k8s/volumes';
import { allSizeUnitsToBytes, bytesToSize } from '../../services/utils';
import {
  setVolumesAction,
  setCurrentVolumeObjectAction,
  setPersistentVolumesAction,
} from './volumes';
import { REFRESH_TIMEOUT } from '../../constants';

const FIVE_SECOND_IN_MS = 5000;

export function useRefreshVolume() {
  const dispatch = useDispatch();
  const result = useQuery(
    ['volumes'],
    Metalk8sVolumesApi.getMetalk8sV1alpha1VolumeList,
    {
      select: (data) => data.body?.items,
      staleTime: FIVE_SECOND_IN_MS,
      refetchInterval: REFRESH_TIMEOUT,
    },
  );

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
  const result = useQuery(
    ['volumesObject', volumeName],
    () => Metalk8sVolumesApi.getMetalk8sV1alpha1Volume(volumeName),
    {
      select: (data) => data.body,
    },
  );

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

  const result = useQuery(
    ['persistentVolumes'],
    VolumesApi.getPersistentVolumes,
    {
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
      refetchInterval: REFRESH_TIMEOUT,
    },
  );

  const { data } = result;

  useEffect(() => {
    if (data) {
      dispatch(setPersistentVolumesAction(data ?? []));
    }
  }, [data, dispatch]);

  return result;
}
