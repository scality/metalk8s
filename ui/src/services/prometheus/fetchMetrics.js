// @flow
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

export function queryNodeCPUMetrics(
  instanceIP: string,
  sampleFrequency: number,
  startingTimeISO: string,
  currentTimeISO: string,
): Promise<PrometheusQueryResult> {
  const cpuUsageQuery = `100 - (avg by (instance) (irate(node_cpu_seconds_total{mode="idle",instance=~"${instanceIP}:${PORT_NODE_EXPORTER}"}[5m])) * 100)`;

  return queryPrometheusRange(
    startingTimeISO,
    currentTimeISO,
    sampleFrequency,
    cpuUsageQuery,
  )?.then((resolve) => {
    if (resolve.error) {
      throw resolve.error;
    }
    return resolve;
  });
}

export function queryNodeMemoryMetrics(
  instanceIP: string,
  sampleFrequency: number,
  startingTimeISO: string,
  currentTimeISO: string,
): ?Promise<PrometheusQueryResult> {
  const memoryQuery = `sum(100 - ((node_memory_MemAvailable_bytes{instance=~"${instanceIP}:${PORT_NODE_EXPORTER}"} * 100) / node_memory_MemTotal_bytes{instance=~"${instanceIP}:${PORT_NODE_EXPORTER}"}))`;
  return queryPrometheusRange(
    startingTimeISO,
    currentTimeISO,
    sampleFrequency,
    memoryQuery,
  )?.then((resolve) => {
    if (resolve.error) {
      throw resolve.error;
    }
    return resolve;
  });
}

export function queryNodeLoadMetrics(
  instanceIP: string,
  sampleFrequency: number,
  startingTimeISO: string,
  currentTimeISO: string,
): ?Promise<PrometheusQueryResult> {
  const systemLoadQuery = `avg(node_load1{instance=~"${instanceIP}:${PORT_NODE_EXPORTER}"}) / count(count(node_cpu_seconds_total{instance=~"${instanceIP}:${PORT_NODE_EXPORTER}"}) by (cpu)) * 100`;

  return queryPrometheusRange(
    startingTimeISO,
    currentTimeISO,
    sampleFrequency,
    systemLoadQuery,
  )?.then((resolve) => {
    if (resolve.error) {
      throw resolve.error;
    }
    return resolve;
  });
}

export function queryThroughputReadAllInstances(
  sampleFrequency: number,
  startingTimeISO: string,
  currentTimeISO: string,
): Promise<PrometheusQueryResult> {
  const nodeThroughputReadQuery = `sum(sum(irate(node_disk_read_bytes_total[1m])) by (instance, device))by(instance)`;

  return queryPrometheusRange(
    startingTimeISO,
    currentTimeISO,
    sampleFrequency,
    nodeThroughputReadQuery,
  )?.then((resolve) => {
    if (resolve.error) {
      throw resolve.error;
    }
    return resolve;
  });
}

export function queryThroughputWriteAllInstances(
  sampleFrequency: number,
  startingTimeISO: string,
  currentTimeISO: string,
): Promise<PrometheusQueryResult> {
  const nodeThroughputWriteQuery = `sum(sum(irate(node_disk_written_bytes_total[1m])) by (instance, device))by(instance)`;

  return queryPrometheusRange(
    startingTimeISO,
    currentTimeISO,
    sampleFrequency,
    nodeThroughputWriteQuery,
  )?.then((resolve) => {
    if (resolve.error) {
      throw resolve.error;
    }
    return resolve;
  });
}

export function queryControlPlaneInAllInstances(
  sampleFrequency: number,
  startingTimeISO: string,
  currentTimeISO: string,
  nodesIPsInfo: any,
  nodes: Array<{ internalIP: string, name: string }>,
): Promise<PrometheusQueryResult>[] {
  return Object.keys(nodesIPsInfo).map((nodeName) => {
    const instanceIP = nodes.find((node) => node.name === nodeName)?.internalIP ?? '';
    const controlPlaneInterface =
      nodesIPsInfo[nodeName]?.controlPlane?.interface;
    const controlPlaneNetworkBandwidthInQuery = `sum(irate(node_network_receive_bytes_total{instance=~"${instanceIP}:${PORT_NODE_EXPORTER}",device="${controlPlaneInterface}"}[5m]))`;

    return queryPrometheusRange(
      startingTimeISO,
      currentTimeISO,
      sampleFrequency,
      controlPlaneNetworkBandwidthInQuery,
    )?.then((resolve) => {
      if (resolve.error) {
        throw resolve.error;
      }
      return { nodeName, ...resolve };
    });
  });
}

export function queryControlPlaneOutAllInstances(
  sampleFrequency: number,
  startingTimeISO: string,
  currentTimeISO: string,
  nodesIPsInfo: any,
  nodes: Array<{ internalIP: string, name: string }>,
): Promise<PrometheusQueryResult>[] {
  return Object.keys(nodesIPsInfo).map((nodeName) => {
    const instanceIP = nodes.find((node) => node.name === nodeName)?.internalIP ?? '';
    const controlPlaneInterface =
      nodesIPsInfo[nodeName]?.controlPlane?.interface;
    const controlPlaneNetworkBandwidthOutQuery = `sum(irate(node_network_transmit_bytes_total{instance=~"${instanceIP}:${PORT_NODE_EXPORTER}",device="${controlPlaneInterface}"}[5m]))`;

    return queryPrometheusRange(
      startingTimeISO,
      currentTimeISO,
      sampleFrequency,
      controlPlaneNetworkBandwidthOutQuery,
    )?.then((resolve) => {
      if (resolve.error) {
        throw resolve.error;
      }
      return { nodeName, ...resolve };
    });
  });
}
