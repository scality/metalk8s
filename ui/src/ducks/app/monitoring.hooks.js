import { useEffect } from 'react';
import { useQuery } from 'react-query';
import { queryPrometheus } from '../../services/prometheus/api';
import { prometheusKey } from '../../services/prometheus/prometheus.key';
import { REFRESH_METRICS_GRAPH } from '../../constants';
import { useDispatch } from 'react-redux';
import { updateCurrentVolumeStatsAction } from './monitoring';

export function getVolumeLatencyCurrentQueryOption() {
  const volumeLatencyCurrentQuery = `irate(node_disk_io_time_seconds_total[1h]) * 1000000`;
  return {
    queryKey: prometheusKey.query(volumeLatencyCurrentQuery),
    queryFn: () => queryPrometheus(volumeLatencyCurrentQuery),
    select: (data) => data?.data?.result,
  };
}

export function getVolumeUsedQueryOption() {
  const volumeUsedQuery = 'kubelet_volume_stats_used_bytes';
  return {
    queryKey: prometheusKey.query(volumeUsedQuery),
    queryFn: () => queryPrometheus(volumeUsedQuery),
    select: (data) => data?.data?.result,
  };
}

export function getVolumeCapacityQuery() {
  const volumeCapacityQuery = 'kubelet_volume_stats_capacity_bytes';
  return {
    queryKey: prometheusKey.query(volumeCapacityQuery),
    queryFn: () => queryPrometheus(volumeCapacityQuery),
    select: (data) => data?.data?.result,
  };
}

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
