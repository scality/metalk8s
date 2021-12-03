import { useEffect } from 'react';
import { useQuery } from 'react-query';
import { useDispatch } from 'react-redux';

import * as Metalk8sVolumesApi from '../../services/k8s/Metalk8sVolumeClient.generated';
import { setVolumesAction } from './volumes';

const TenSecondsInMs = 10000;
const fiveSecondsInMs = 5000;

export function useRefreshVolume() {
  const dispatch = useDispatch();
  const { data } = useQuery(
    ['volumes'],
    Metalk8sVolumesApi.getMetalk8sV1alpha1VolumeList,
    {
      select: (data) => data.body?.items,
      staleTime: fiveSecondsInMs,
      refetchInterval: TenSecondsInMs,
    },
  );

  useEffect(() => {
    if (data) {
      dispatch(setVolumesAction(data));
    }
  }, [data, dispatch]);
}
