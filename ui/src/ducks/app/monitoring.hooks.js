import { useEffect, useMemo } from 'react';
import { useQueries } from 'react-query';
import { queryPrometheus } from '../../services/prometheus/api';
import { REFRESH_METRICS_GRAPH } from '../../constants';
import { useDispatch } from 'react-redux';
import { updateCurrentVolumeStatsAction } from './monitoring';

export function useFetchCurrentVolumeStats() {
  const dispatch = useDispatch();

  const volumeLatencyCurrentQuery = `irate(node_disk_io_time_seconds_total[1h]) * 1000000`;
  // Grafana - Used Space: kubelet_volume_stats_capacity_bytes - kubelet_volume_stats_available_bytes
  const volumeUsedQuery = 'kubelet_volume_stats_used_bytes';
  const volumeCapacityQuery = 'kubelet_volume_stats_capacity_bytes';

  const queries = [
    volumeCapacityQuery,
    volumeUsedQuery,
    volumeLatencyCurrentQuery,
  ];

  const [volumeCapacityResult, volumeUsedResult, volumeLatencyResult] =
    useQueries(
      queries.map((query) => {
        return {
          queryKey: ['user', query],
          queryFn: () => queryPrometheus(query),
          select: (data) => data?.data?.result,
          refetchInterval: REFRESH_METRICS_GRAPH,
        };
      }),
    );

  const metrics = useMemo(
    () => ({
      volumeUsedCurrent: volumeUsedResult.data,
      volumeCapacityCurrent: volumeCapacityResult.data,
      volumeLatencyCurrent: volumeLatencyResult.data,
    }),
    [
      volumeCapacityResult.data,
      volumeUsedResult.data,
      volumeLatencyResult.data,
    ],
  );

  useEffect(() => {
    dispatch(updateCurrentVolumeStatsAction({ metrics: metrics }));
  }, [metrics, dispatch]);

  return {
    metrics,
  };
}
