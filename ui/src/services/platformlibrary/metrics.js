import { PORT_NODE_EXPORTER } from '../../constants';
import { queryPromtheusMetrics } from '../prometheus/fetchMetrics';
import type { NodesState } from '../../ducks/app/nodes';

export type TimeSpanProps = {
  startingTimeISO: string,
  currentTimeISO: string,
  frequency: number,
};

const getPrometheusQuery = (
  queryKey: string[],
  prometheusQuery: string,
  { startingTimeISO, currentTimeISO, frequency }: TimeSpanProps,
): typeof useQuery => {
  queryKey.push(startingTimeISO);
  return {
    queryKey,
    queryFn: () => {
      return queryPromtheusMetrics(
        frequency,
        startingTimeISO,
        currentTimeISO,
        encodeURIComponent(prometheusQuery),
      );
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  };
};

// the queries for the metrics
// TODO: we may want to merge useStartingTimeStamp() and useMetricsTimeSpan(), so the all props related to timespan will be returned in one object
export const getCPUUsageQuery = (
  instanceIP: string,
  timespanProps: TimeSpanProps,
) => {
  const { startingTimeISO, currentTimeISO, frequency } = timespanProps;
  const cpuUsagePrometheusQuery = `100 - (avg by (instance) (irate(node_cpu_seconds_total{mode="idle",instance=~"${instanceIP}:${PORT_NODE_EXPORTER}"}[5m])) * 100)`;

  return {
    queryKey: ['CpuUsage', instanceIP, startingTimeISO],
    queryFn: () => {
      return queryPromtheusMetrics(
        frequency,
        startingTimeISO,
        currentTimeISO,
        cpuUsagePrometheusQuery,
      );
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    enabled: instanceIP !== '',
  };
};

export const getCPUUsageAvgQuery = (
  timespanProps: TimeSpanProps,
  showAvg: boolean,
) => {
  const { startingTimeISO, currentTimeISO, frequency } = timespanProps;

  const cpuUsageAvgPrometheusQuery = `avg(100 - (avg by (instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100))`;

  return {
    queryKey: ['CpuUsageAvg', startingTimeISO],
    queryFn: () => {
      return queryPromtheusMetrics(
        frequency,
        startingTimeISO,
        currentTimeISO,
        cpuUsageAvgPrometheusQuery,
      );
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    enabled: showAvg,
  };
};

export const getSystemLoadQuery = (
  instanceIP: string,
  timespanProps: TimeSpanProps,
) => {
  const { startingTimeISO, currentTimeISO, frequency } = timespanProps;
  const systemLoadPrometheusQuery = `avg(node_load1{instance=~"${instanceIP}:${PORT_NODE_EXPORTER}"}) / count(count(node_cpu_seconds_total{instance=~"${instanceIP}:${PORT_NODE_EXPORTER}"}) by (cpu)) * 100`;

  return {
    queryKey: ['SystemLoad', instanceIP, startingTimeISO],
    queryFn: () => {
      return queryPromtheusMetrics(
        frequency,
        startingTimeISO,
        currentTimeISO,
        systemLoadPrometheusQuery,
      );
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  };
};

export const getSystemLoadAvgQuery = (
  timespanProps: TimeSpanProps,
  showAvg: boolean,
) => {
  const { startingTimeISO, currentTimeISO, frequency } = timespanProps;
  const systemLoadAvgPrometheusQuery = `avg(node_load1/count without(cpu, mode) (node_cpu_seconds_total{mode="idle"})) * 100`;

  return {
    queryKey: ['SystemLoadAvg', startingTimeISO],
    queryFn: () => {
      return queryPromtheusMetrics(
        frequency,
        startingTimeISO,
        currentTimeISO,
        systemLoadAvgPrometheusQuery,
      );
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  };
};

export const getMemoryQuery = (
  instanceIP: string,
  timespanProps: TimeSpanProps,
) => {
  const { startingTimeISO, currentTimeISO, frequency } = timespanProps;
  const memoryPrometheusQuery = `sum(100 - ((node_memory_MemAvailable_bytes{instance=~"${instanceIP}:${PORT_NODE_EXPORTER}"} * 100) / node_memory_MemTotal_bytes{instance=~"${instanceIP}:${PORT_NODE_EXPORTER}"}))`;

  return {
    queryKey: ['Memory', instanceIP, startingTimeISO],
    queryFn: () => {
      return queryPromtheusMetrics(
        frequency,
        startingTimeISO,
        currentTimeISO,
        memoryPrometheusQuery,
      );
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  };
};

export const getMemoryAvgQuery = (
  timespanProps: TimeSpanProps,
  showAvg: boolean,
) => {
  const { startingTimeISO, currentTimeISO, frequency } = timespanProps;

  const memoryAvgPrometheusQuery = `avg(100 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100)`;

  return {
    queryKey: ['MemoryAvg', startingTimeISO],
    queryFn: () => {
      return queryPromtheusMetrics(
        frequency,
        startingTimeISO,
        currentTimeISO,
        memoryAvgPrometheusQuery,
      );
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    enabled: showAvg,
  };
};

const getPlaneBandWidthInPromQuery = (
  instanceIP: string,
  planeInterface: string,
) => {
  return `sum(irate(node_network_receive_bytes_total{instance=~"${instanceIP}:${PORT_NODE_EXPORTER}",device="${planeInterface}"}[5m]))`;
};

const getPlaneBandWidthOutPromQuery = (
  instanceIP: string,
  planeInterface: string,
) => {
  return `sum(irate(node_network_transmit_bytes_total{instance=~"${instanceIP}:${PORT_NODE_EXPORTER}",device="${planeInterface}"}[5m]))`;
};

export const getControlPlaneBandWidthInQuery = (
  instanceIP: string,
  timespanProps: TimeSpanProps,
  planeInterface: string,
) => {
  const { startingTimeISO, currentTimeISO, frequency } = timespanProps;

  return {
    queryKey: ['ControlPlaneBandwidthIn', instanceIP, startingTimeISO],
    queryFn: () => {
      return queryPromtheusMetrics(
        frequency,
        startingTimeISO,
        currentTimeISO,
        getPlaneBandWidthInPromQuery(instanceIP, planeInterface),
      );
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    enabled: planeInterface !== '',
  };
};

export const getControlPlaneBandWidthOutQuery = (
  instanceIP: string,
  timespanProps: TimeSpanProps,
  planeInterface: string,
) => {
  const { startingTimeISO, currentTimeISO, frequency } = timespanProps;

  return {
    queryKey: ['ControlPlaneBandwidthOut', instanceIP, startingTimeISO],
    queryFn: () => {
      return queryPromtheusMetrics(
        frequency,
        startingTimeISO,
        currentTimeISO,
        getPlaneBandWidthOutPromQuery(instanceIP, planeInterface),
      );
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    enabled: planeInterface !== '',
  };
};

export const getControlPlaneBandWidthAvgInQuery = (
  timespanProps: TimeSpanProps,
  showAvg: boolean,
  instanceIP: string,
  nodesIPsInfo: $PropertyType<NodesState, 'IPsInfo'>,
) => {
  const { startingTimeISO, currentTimeISO, frequency } = timespanProps;
  const nodesCPBandwidthInPrometheusQuery = [];
  for (let nodeIPsInfo of Object.values(nodesIPsInfo)) {
    const controlPlaneInterface = nodeIPsInfo?.controlPlane?.interface;
    const instanceIP = nodeIPsInfo?.controlPlane?.ip;

    if (controlPlaneInterface) {
      nodesCPBandwidthInPrometheusQuery.push(
        getPlaneBandWidthInPromQuery(instanceIP, controlPlaneInterface),
      );
    }
  }

  const nodeCPBandwithInAvgPrometheusQuery = encodeURIComponent(
    `${nodesCPBandwidthInPrometheusQuery.join('+')} / ${
      nodesCPBandwidthInPrometheusQuery.length
    }`,
  );

  return {
    queryKey: ['ControlPlaneBandwidthAvgIn', instanceIP, startingTimeISO],
    queryFn: () => {
      return queryPromtheusMetrics(
        frequency,
        startingTimeISO,
        currentTimeISO,
        nodeCPBandwithInAvgPrometheusQuery,
      );
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    enabled: showAvg,
  };
};

export const getControlPlaneBandWidthAvgOutQuery = (
  timespanProps: TimeSpanProps,
  showAvg: boolean,
  instanceIP: string,
  nodesIPsInfo: $PropertyType<NodesState, 'IPsInfo'>,
) => {
  const { startingTimeISO, currentTimeISO, frequency } = timespanProps;
  const nodesCPBandwidthOutPrometheusQuery = [];

  for (let nodeIPsInfo of Object.values(nodesIPsInfo)) {
    const controlPlaneInterface = nodeIPsInfo?.controlPlane?.interface;
    const instanceIP = nodeIPsInfo?.controlPlane?.ip;

    if (controlPlaneInterface) {
      nodesCPBandwidthOutPrometheusQuery.push(
        getPlaneBandWidthOutPromQuery(instanceIP, controlPlaneInterface),
      );
    }
  }

  const nodeCPBandwithAvgOutPrometheusQuery = encodeURIComponent(
    `${nodesCPBandwidthOutPrometheusQuery.join('+')} / ${
      nodesCPBandwidthOutPrometheusQuery.length
    }`,
  );

  return {
    queryKey: ['ControlPlaneBandwidthAvgOut', instanceIP, startingTimeISO],
    queryFn: () => {
      return queryPromtheusMetrics(
        frequency,
        startingTimeISO,
        currentTimeISO,
        nodeCPBandwithAvgOutPrometheusQuery,
      );
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    enabled: showAvg,
  };
};

export const getWorkloadPlaneBandWidthInQuery = (
  instanceIP: string,
  timespanProps: TimeSpanProps,
  planeInterface: string,
) => {
  const { startingTimeISO, currentTimeISO, frequency } = timespanProps;

  return {
    queryKey: ['WorkloadPlaneBandwidthIn', instanceIP, startingTimeISO],
    queryFn: () => {
      return queryPromtheusMetrics(
        frequency,
        startingTimeISO,
        currentTimeISO,
        getPlaneBandWidthInPromQuery(instanceIP, planeInterface),
      );
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    enabled: planeInterface !== '',
  };
};

export const getWorkloadPlaneBandWidthOutQuery = (
  instanceIP: string,
  timespanProps: TimeSpanProps,
  planeInterface: string,
) => {
  const { startingTimeISO, currentTimeISO, frequency } = timespanProps;

  return {
    queryKey: ['WorkloadPlaneBandwidthOut', instanceIP, startingTimeISO],
    queryFn: () => {
      return queryPromtheusMetrics(
        frequency,
        startingTimeISO,
        currentTimeISO,
        getPlaneBandWidthOutPromQuery(instanceIP, planeInterface),
      );
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    enabled: planeInterface !== '',
  };
};

export const getWorkloadPlaneBandWidthAvgInQuery = (
  timespanProps: TimeSpanProps,
  showAvg: boolean,
  instanceIP: string,
  nodesIPsInfo: $PropertyType<NodesState, 'IPsInfo'>,
) => {
  const { startingTimeISO, currentTimeISO, frequency } = timespanProps;
  const nodesWPBandwidthInPrometheusQuery = [];
  for (let nodeIPsInfo of Object.values(nodesIPsInfo)) {
    const instanceIP = nodeIPsInfo?.controlPlane?.ip;
    const workloadPlaneInterface = nodeIPsInfo?.workloadPlane?.interface;

    if (workloadPlaneInterface) {
      nodesWPBandwidthInPrometheusQuery.push(
        getPlaneBandWidthInPromQuery(instanceIP, workloadPlaneInterface),
      );
    }
  }

  const nodeWPBandwithInAvgPrometheusQuery = encodeURIComponent(
    `${nodesWPBandwidthInPrometheusQuery.join('+')} / ${
      nodesWPBandwidthInPrometheusQuery.length
    }`,
  );

  return {
    queryKey: ['WorkloadPlaneBandwidthAvgIn', instanceIP, startingTimeISO],
    queryFn: () => {
      return queryPromtheusMetrics(
        frequency,
        startingTimeISO,
        currentTimeISO,
        nodeWPBandwithInAvgPrometheusQuery,
      );
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    enabled: showAvg,
  };
};

export const getWorkloadPlaneBandWidthAvgOutQuery = (
  timespanProps: TimeSpanProps,
  showAvg: boolean,
  instanceIP: string,
  nodesIPsInfo: $PropertyType<NodesState, 'IPsInfo'>,
) => {
  const { startingTimeISO, currentTimeISO, frequency } = timespanProps;
  const nodesWPBandwidthOutPrometheusQuery = [];

  for (let nodeIPsInfo of Object.values(nodesIPsInfo)) {
    const controlPlaneInterface = nodeIPsInfo?.controlPlane?.interface;
    const instanceIP = nodeIPsInfo?.controlPlane?.ip;

    if (controlPlaneInterface) {
      nodesWPBandwidthOutPrometheusQuery.push(
        getPlaneBandWidthOutPromQuery(instanceIP, controlPlaneInterface),
      );
    }
  }

  const nodeWPBandwithAvgOutPrometheusQuery = encodeURIComponent(
    `${nodesWPBandwidthOutPrometheusQuery.join('+')} / ${
      nodesWPBandwidthOutPrometheusQuery.length
    }`,
  );

  return {
    queryKey: ['WorkloadPlaneBandwidthAvgOut', instanceIP, startingTimeISO],
    queryFn: () => {
      return queryPromtheusMetrics(
        frequency,
        startingTimeISO,
        currentTimeISO,
        nodeWPBandwithAvgOutPrometheusQuery,
      );
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    enabled: showAvg,
  };
};

export const getIOPSWriteQuery = (
  instanceIP: string,
  timespanProps: TimeSpanProps,
) => {
  const { startingTimeISO, currentTimeISO, frequency } = timespanProps;
  const iopsWritePrometheusQuery = `sum(irate(node_disk_writes_completed_total{instance=~"${instanceIP}:${PORT_NODE_EXPORTER}"}[5m])) by (instance)`;

  return {
    queryKey: ['iopsWrite', instanceIP, startingTimeISO],
    queryFn: () => {
      return queryPromtheusMetrics(
        frequency,
        startingTimeISO,
        currentTimeISO,
        iopsWritePrometheusQuery,
      );
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  };
};

export const getIOPSReadQuery = (
  instanceIP: string,
  timespanProps: TimeSpanProps,
) => {
  const { startingTimeISO, currentTimeISO, frequency } = timespanProps;
  const iopsReadPrometheusQuery = `sum(irate(node_disk_reads_completed_total{instance=~"${instanceIP}:${PORT_NODE_EXPORTER}"}[5m])) by (instance)`;

  return {
    queryKey: ['iopsRead', instanceIP, startingTimeISO],
    queryFn: () => {
      return queryPromtheusMetrics(
        frequency,
        startingTimeISO,
        currentTimeISO,
        iopsReadPrometheusQuery,
      );
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  };
};

// IOPS Write Average (+)
export const getIOPSWriteAvgQuery = (
  timespanProps: TimeSpanProps,
  showAvg: boolean,
) => {
  const { startingTimeISO, currentTimeISO, frequency } = timespanProps;
  const iopsWriteAvgPrometheusQuery = `avg(sum(irate(node_disk_writes_completed_total[5m])) by (instance))`;

  return {
    queryKey: ['iopsWriteAvg', startingTimeISO],
    queryFn: () => {
      return queryPromtheusMetrics(
        frequency,
        startingTimeISO,
        currentTimeISO,
        iopsWriteAvgPrometheusQuery,
      );
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    enabled: showAvg,
  };
};

// IOPS Read Average (-)
export const getIOPSReadAvgQuery = (
  timespanProps: TimeSpanProps,
  showAvg: boolean,
) => {
  const { startingTimeISO, currentTimeISO, frequency } = timespanProps;
  const iopsReadAvgPrometheusQuery = `avg(sum(irate(node_disk_reads_completed_total[5m])) by (instance))`;

  return {
    queryKey: ['iopsReadAvg', startingTimeISO],
    queryFn: () => {
      return queryPromtheusMetrics(
        frequency,
        startingTimeISO,
        currentTimeISO,
        iopsReadAvgPrometheusQuery,
      );
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    enabled: showAvg,
  };
};

export const getVolumeUsageQuery = (
  pvcName: string,
  namespace: string,
  timespanProps: TimeSpanProps,
): typeof useQuery => {
  const prometheusFilters = `{namespace="${namespace}",persistentvolumeclaim="${pvcName}"}`;
  const volumeUsageQuery = `kubelet_volume_stats_used_bytes${prometheusFilters} / kubelet_volume_stats_capacity_bytes${prometheusFilters} * 100`;
  return getPrometheusQuery(
    ['volumeUsage', pvcName, namespace],
    volumeUsageQuery,
    timespanProps,
  );
};

const getNodeDevicePrometheusFilter = (
  instanceIp: string,
  deviceName: string,
) => {
  return `{instance="${instanceIp}:${PORT_NODE_EXPORTER}",device="${deviceName}"}`;
};

export const getVolumeThroughputReadQuery = (
  instanceIp: string,
  deviceName: string,
  timespanProps: TimeSpanProps,
): typeof useQuery => {
  const prometheusFilters = getNodeDevicePrometheusFilter(
    instanceIp,
    deviceName,
  );
  const volumeThroughputReadQuery = `sum(irate(node_disk_read_bytes_total${prometheusFilters}[1m]))`;
  return getPrometheusQuery(
    ['volumeThroughputRead', instanceIp, deviceName],
    volumeThroughputReadQuery,
    timespanProps,
  );
};

export const getVolumeThroughputWriteQuery = (
  instanceIp: string,
  deviceName: string,
  timespanProps: TimeSpanProps,
): typeof useQuery => {
  const prometheusFilters = getNodeDevicePrometheusFilter(
    instanceIp,
    deviceName,
  );
  const volumeThroughputWriteQuery = `sum(irate(node_disk_written_bytes_total${prometheusFilters}[1m]))`;
  return getPrometheusQuery(
    ['volumeThroughputWrite', instanceIp, deviceName],
    volumeThroughputWriteQuery,
    timespanProps,
  );
};

export const getVolumeIOPSReadQuery = (
  instanceIp: string,
  deviceName: string,
  timespanProps: TimeSpanProps,
): typeof useQuery => {
  const prometheusFilters = getNodeDevicePrometheusFilter(
    instanceIp,
    deviceName,
  );
  const volumeIOPSReadQuery = `sum(irate(node_disk_reads_completed_total${prometheusFilters}[5m]))`;
  return getPrometheusQuery(
    ['volumeIOPSRead', instanceIp, deviceName],
    volumeIOPSReadQuery,
    timespanProps,
  );
};

export const getVolumeIOPSWriteQuery = (
  instanceIp: string,
  deviceName: string,
  timespanProps: TimeSpanProps,
): typeof useQuery => {
  const prometheusFilters = getNodeDevicePrometheusFilter(
    instanceIp,
    deviceName,
  );
  const volumeIOPSWriteQuery = `sum(irate(node_disk_writes_completed_total${prometheusFilters}[5m]))`;
  return getPrometheusQuery(
    ['volumeIOPSWrite', instanceIp, deviceName],
    volumeIOPSWriteQuery,
    timespanProps,
  );
};

export const getVolumeLatencyWriteQuery = (
  instanceIp: string,
  deviceName: string,
  timespanProps: TimeSpanProps,
): typeof useQuery => {
  const prometheusFilters = getNodeDevicePrometheusFilter(
    instanceIp,
    deviceName,
  );
  const volumeLatencyWriteQuery = `sum(irate(node_disk_write_time_seconds_total${prometheusFilters}[5m]) / irate(node_disk_writes_completed_total${prometheusFilters}[5m])) * 1000000`;
  return getPrometheusQuery(
    ['volumeLatencyWrite', instanceIp, deviceName],
    volumeLatencyWriteQuery,
    timespanProps,
  );
};

export const getVolumeLatencyReadQuery = (
  instanceIp: string,
  deviceName: string,
  timespanProps: TimeSpanProps,
): typeof useQuery => {
  const prometheusFilters = getNodeDevicePrometheusFilter(
    instanceIp,
    deviceName,
  );
  const volumeLatencyReadQuery = `sum(irate(node_disk_read_time_seconds_total${prometheusFilters}[5m]) / irate(node_disk_reads_completed_total${prometheusFilters}[5m])) * 1000000`;
  return getPrometheusQuery(
    ['volumeLatencyRead', instanceIp, deviceName],
    volumeLatencyReadQuery,
    timespanProps,
  );
};
