import { useEffect } from 'react';
import { useQuery } from 'react-query';
import { useDispatch } from 'react-redux';
import { REFRESH_METRICS_GRAPH } from '../constants';
import { updateCurrentVolumeStatsAction } from '../ducks/app/monitoring';
import {
  getVolumeCapacityQuery,
  getVolumeLatencyCurrentQueryOption,
  getVolumeUsedQueryOption,
} from '../services/platformlibrary/metrics';
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
    dispatch(
      updateCurrentVolumeStatsAction({
        metrics: metrics,
      }),
    );
  }, [volumeUsedCurrent, volumeCapacityCurrent, volumeLatencyCurrent, dispatch]);
  return {
    metrics,
  };
}
