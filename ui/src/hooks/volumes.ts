import { useEffect } from 'react';
import { useQuery } from 'react-query';
import { useDispatch } from 'react-redux';
import {
  getCurrentVolumeObjectQueryOption,
  getVolumeQueryOption,
  getPersistentVolumeQueryOption,
} from '../services/platformlibrary/k8s';
import {
  setVolumesAction,
  setCurrentVolumeObjectAction,
  setPersistentVolumesAction,
} from '../ducks/app/volumes';
import { REFRESH_TIMEOUT } from '../constants';
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