import { useEffect } from 'react';
import { useQuery } from 'react-query';
import {
  getVolumeUsedQueryOption,
  getVolumeCapacityQuery,
  getVolumeLatencyCurrentQueryOption,
} from '../services/platformlibrary/metrics';
import { REFRESH_METRICS_GRAPH } from '../constants';
import { useDispatch } from 'react-redux';
import { updateCurrentVolumeStatsAction } from '../ducks/app/monitoring';

export function useFetchCurrentVolumeStats() {
  const dispatch = useDispatch();

  const { data: volumeUsedCurrent } = useQuery({
    ...getVolumeUsedQueryOption(),
    refetchInterval: REFRESH_METRICS_GRAPH,
  });

  const { data: volumeCapacityCurrent } = useQuery({
    ...getVolumeCapacityQuery(),
    refetchInterval: REFRESH_METRICS_GRAPH,
  });

  const { data: volumeLatencyCurrent } = useQuery({
    ...getVolumeLatencyCurrentQueryOption(),
    refetchInterval: REFRESH_METRICS_GRAPH,
  });

  const metrics = {
    volumeUsedCurrent,
    volumeCapacityCurrent,
    volumeLatencyCurrent,
  };

  useEffect(() => {
    dispatch(updateCurrentVolumeStatsAction({ metrics: metrics }));
  }, [metrics, dispatch]);

  return {
    metrics,
  };
}
