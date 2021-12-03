import { useEffect } from 'react';
import { useQuery } from 'react-query';
import { useDispatch } from 'react-redux';

import * as Metalk8sVolumesApi from '../../services/k8s/Metalk8sVolumeClient.generated';
import { setVolumesAction, setCurrentVolumeObjectAction } from './volumes';

const TenSecondsInMs = 10000;
const fiveSecondsInMs = 5000;

export function useRefreshVolume() {
  const dispatch = useDispatch();
  const result = useQuery(
    ['volumes'],
    Metalk8sVolumesApi.getMetalk8sV1alpha1VolumeList,
    {
      select: (data) => data.body?.items,
      staleTime: fiveSecondsInMs,
      refetchInterval: TenSecondsInMs,
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
