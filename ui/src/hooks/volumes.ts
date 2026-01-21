import { useEffect } from 'react';
import { useQuery } from 'react-query';
import { useDispatch } from 'react-redux';
import { REFRESH_TIMEOUT } from '../constants';
import { setCurrentVolumeObjectAction, setPersistentVolumesAction, setVolumesAction } from '../ducks/app/volumes';
import {
  useGetCurrentVolumeObjectQueryOption,
  useGetPersistentVolumeQueryOption,
  useGetVolumeQueryOption,
} from '../services/platformlibrary/k8s';
export function useRefreshVolume() {
  const dispatch = useDispatch();
  const result = useQuery({
    ...useGetVolumeQueryOption(),
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
  const result = useQuery({
    ...useGetCurrentVolumeObjectQueryOption(volumeName),
  });
  const { data } = result;
  useEffect(() => {
    if (data) {
      dispatch(
        setCurrentVolumeObjectAction(
          data
            ? {
                data,
              }
            : null,
        ),
      );
    }
  }, [data, dispatch]);
  return result;
}
export function useGetPersistentVolumes() {
  const dispatch = useDispatch();
  const result = useQuery({
    ...useGetPersistentVolumeQueryOption(),
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
