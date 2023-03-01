import { queryPrometheus, queryPrometheusRange } from './api';
import { PORT_NODE_EXPORTER } from '../../constants';
import type { PrometheusQueryResult } from './api';
export function queryNodeFSUsage(
  instanceIP: string,
): Promise<PrometheusQueryResult> {
  // All system partitions, except the ones mounted by containerd.
  // Ingoring the Filesystem ISSO 9660 and tmpfs & share memory devices.
  const nodeFilesystemUsageQuery = `(1 - node_filesystem_avail_bytes{instance=~"${instanceIP}:${PORT_NODE_EXPORTER}",job=~"node-exporter",device!~'rootfs|shm|tmpfs', fstype!='iso9660'} / node_filesystem_size_bytes{instance=~"${instanceIP}:${PORT_NODE_EXPORTER}",job=~"node-exporter",device!~'rootfs|shm', fstype!='iso9660'}) * 100`;
  return queryPrometheus(nodeFilesystemUsageQuery).then((resolve) => {
    if (resolve.error) {
      throw resolve.error;
    }

    return resolve;
  });
}
export function queryNodeFSSize(
  instanceIP: string,
): Promise<PrometheusQueryResult> {
  const nodeFilesystemSizeBytesQuery = `node_filesystem_size_bytes{instance=~"${instanceIP}:${PORT_NODE_EXPORTER}",job=~"node-exporter",device!~'rootfs|shm|tmpfs', fstype!='iso9660'}`;
  return queryPrometheus(nodeFilesystemSizeBytesQuery).then((resolve) => {
    if (resolve.error) {
      throw resolve.error;
    }

    return resolve;
  });
}
export function queryPromtheusMetrics(
  frequency: number,
  startingTimeISO: string,
  currentTimeISO: string,
  promQuery: string,
): Promise<PrometheusQueryResult> {
  const promPromise = queryPrometheusRange(
    startingTimeISO,
    currentTimeISO,
    frequency,
    promQuery,
  );

  if (promPromise) {
    return promPromise.then((resolve) => {
      if (resolve.error) {
        throw resolve.error;
      }

      return resolve;
    });
  }

  return Promise.reject();
}