import {
  PORT_NODE_EXPORTER,
  STATUS_CRITICAL,
  STATUS_WARNING,
} from '../../constants';
import { queryPromtheusMetrics } from '../prometheus/fetchMetrics';
import type { NodesState } from '../../ducks/app/nodes';
import { queryPrometheus, queryPrometheusRange } from '../prometheus/api';
import { addMissingDataPoint } from '@scality/core-ui/dist/components/linetemporalchart/ChartUtil';
import { getNaNSegments, getSegments } from '../utils';
import { getFormattedLokiAlert } from '../loki/api';
import { NAN_STRING } from '@scality/core-ui/dist/components/constants';

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

export const getNodesCPUUsageQuery = (timespanProps: TimeSpanProps) => {
  const { startingTimeISO, currentTimeISO, frequency } = timespanProps;
  const cpuNodesUsagePrometheusQuery =
    '100 - (avg by (instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)';
  return {
    queryKey: ['NodesCpuUsage', startingTimeISO],
    queryFn: () => {
      return queryPromtheusMetrics(
        frequency,
        startingTimeISO,
        currentTimeISO,
        cpuNodesUsagePrometheusQuery,
      );
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  };
};

export const getNodesCPUUsageQuantileQuery = (
  timespanProps: TimeSpanProps,
  quantile: number,
) => {
  const { startingTimeISO, currentTimeISO, frequency } = timespanProps;
  const cpuNodesUsagePrometheusQuery = `quantile(${quantile}, 100 - (avg by (instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100))`;
  return {
    queryKey: ['NodesCpuUsageQuantile', startingTimeISO, quantile],
    queryFn: () => {
      return queryPromtheusMetrics(
        frequency,
        startingTimeISO,
        currentTimeISO,
        cpuNodesUsagePrometheusQuery,
      );
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  };
};

export const getNodesCPUUsageAboveBelowThresholdQuery = (
  timestamp?: string,
  threshold?: number,
  operator: '>' | '<',
  isOnHoverFetchingNeeded: boolean,
) => {
  const cpuNodesUsagePrometheusQuery = `100 - (avg by (instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) ${operator}= ${threshold}`;
  return {
    queryKey: [
      'NodesCpuUsageAboveBelowThreshold',
      timestamp,
      threshold,
      operator,
    ],
    queryFn: () => {
      const promPromise = queryPrometheus(
        cpuNodesUsagePrometheusQuery,
        timestamp,
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
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    enabled: !!(
      timestamp &&
      threshold !== undefined &&
      isOnHoverFetchingNeeded
    ),
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

export const getNodesSystemLoadQuery = (timespanProps: TimeSpanProps) => {
  const { startingTimeISO, currentTimeISO, frequency } = timespanProps;
  const systemLoadPrometheusQuery = `(avg(node_load1) by (instance) / ignoring(container,endpoint,job,namespace,pod,service,prometheus) count(node_cpu_seconds_total{mode="idle"}) without(cpu,mode)) * 100`;

  return {
    queryKey: ['SystemLoad', startingTimeISO],
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

export const getNodesSystemLoadQuantileQuery = (
  timespanProps: TimeSpanProps,
  quantile: number,
) => {
  const { startingTimeISO, currentTimeISO, frequency } = timespanProps;
  const systemLoadQuantilePromQL = `quantile(${quantile}, (avg(node_load1) by (instance) / ignoring(container,endpoint,job,namespace,pod,service,prometheus) count(node_cpu_seconds_total{mode="idle"}) without(cpu,mode))) * 100`;

  return {
    queryKey: ['SystemLoadQuantile', startingTimeISO, quantile],
    queryFn: () => {
      return queryPromtheusMetrics(
        frequency,
        startingTimeISO,
        currentTimeISO,
        systemLoadQuantilePromQL,
      );
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  };
};

export const getNodesSystemLoadAboveBelowThresholdQuery = (
  timestamp?: string,
  threshold?: number,
  operator: '>' | '<',
  isOnHoverFetchingNeeded: boolean,
) => {
  const nodesSystemLoadAboveBelowPromQL = `(avg(node_load1) by (instance) / ignoring(container,endpoint,job,namespace,pod,service,prometheus) count(node_cpu_seconds_total{mode="idle"}) without(cpu,mode)) * 100 ${operator}= ${threshold}`;
  return {
    queryKey: [
      'NodesSystemLoadAboveBelowThreshold',
      timestamp,
      threshold,
      operator,
    ],
    queryFn: () => {
      const promPromise = queryPrometheus(
        nodesSystemLoadAboveBelowPromQL,
        timestamp,
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
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    enabled: !!(
      timestamp &&
      threshold !== undefined &&
      isOnHoverFetchingNeeded
    ),
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

export const getNodesMemoryQuery = (timespanProps: TimeSpanProps) => {
  const { startingTimeISO, currentTimeISO, frequency } = timespanProps;
  const memoryPrometheusQuery = `sum(100 - ((node_memory_MemAvailable_bytes * 100) / node_memory_MemTotal_bytes)) by(instance)`;

  return {
    queryKey: ['NodesMemory', startingTimeISO],
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

export const getNodesMemoryQuantileQuery = (
  timespanProps: TimeSpanProps,
  quantile: number,
) => {
  const { startingTimeISO, currentTimeISO, frequency } = timespanProps;
  const nodesMemoryQuantilePromQL = `quantile(${quantile}, sum(100 - ((node_memory_MemAvailable_bytes * 100) / node_memory_MemTotal_bytes)) by(instance))`;

  return {
    queryKey: ['NodesMemoryQuantile', startingTimeISO, quantile],
    queryFn: () => {
      return queryPromtheusMetrics(
        frequency,
        startingTimeISO,
        currentTimeISO,
        nodesMemoryQuantilePromQL,
      );
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  };
};

export const getNodesMemoryAboveBelowThresholdQuery = (
  timestamp?: string,
  threshold?: number,
  operator: '>' | '<',
) => {
  const nodesMemoryAboveBelowPromQL = `sum(100 - ((node_memory_MemAvailable_bytes * 100) / node_memory_MemTotal_bytes)) by(instance) ${operator}= ${threshold}`;
  return {
    queryKey: [
      'NodesMemoryAboveBelowThreshold',
      timestamp,
      threshold,
      operator,
    ],
    queryFn: () => {
      const promPromise = queryPrometheus(
        nodesMemoryAboveBelowPromQL,
        timestamp,
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
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    enabled: !!(timestamp && threshold !== undefined),
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
    `(${nodesCPBandwidthInPrometheusQuery.join('+')}) / ${
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
    `(${nodesCPBandwidthOutPrometheusQuery.join('+')}) / ${
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
    `(${nodesWPBandwidthInPrometheusQuery.join('+')}) / ${
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
    `(${nodesWPBandwidthOutPrometheusQuery.join('+')}) / ${
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

// this query is to get the bandwidth for all interfaces eth0, eth1 and eth2
// then we do filter base on the interface of the node which we can retrieve from Salt API
export const getNodesPlanesBandwidthInQuery = (
  timespanProps,
  devices: string[],
) => {
  const nodesPlanesBandwidthInQuery = `avg(irate(node_network_receive_bytes_total{device=~"${devices.join(
    '|',
  )}"}[5m])) by (instance,device)`;

  return {
    ...getPrometheusQuery(
      ['NodesPlanesBandwidthIn', ...devices],
      nodesPlanesBandwidthInQuery,
      timespanProps,
    ),
    enabled: !!devices?.length,
  };
};

export const getNodesPlanesBandwidthOutQuery = (
  timespanProps,
  devices: string[],
) => {
  const nodePlanesBandwidthOutQuery = `avg(irate(node_network_transmit_bytes_total{device=~"${devices.join(
    '|',
  )}"}[5m])) by (instance,device)`;

  return {
    ...getPrometheusQuery(
      ['NodesPlanesBandwidthOut', ...devices],
      nodePlanesBandwidthOutQuery,
      timespanProps,
    ),
    enabled: !!devices?.length,
  };
};

export const getNodesPlanesBandwidthInQuantileQuery = (
  timespanProps,
  quantile: number,
  devices: string[],
) => {
  const nodesPlanesBandwidthInQuery = `quantile(${quantile}, avg(irate(node_network_receive_bytes_total{device=~"${devices.join(
    '|',
  )}"}[5m])) by (instance,device))`;

  return {
    ...getPrometheusQuery(
      ['NodesPlanesBandwidthIn', ...devices, quantile],
      nodesPlanesBandwidthInQuery,
      timespanProps,
    ),
    enabled: !!devices?.length,
  };
};

export const getNodesPlanesBandwidthOutQuantileQuery = (
  timespanProps,
  quantile: number,
  devices: string[],
) => {
  const nodePlanesBandwidthOutQuery = `quantile(${quantile}, avg(irate(node_network_transmit_bytes_total{device=~"${devices.join(
    '|',
  )}"}[5m])) by (instance,device))`;

  return {
    ...getPrometheusQuery(
      ['NodesPlanesBandwidthOut', ...devices, quantile],
      nodePlanesBandwidthOutQuery,
      timespanProps,
    ),
    enabled: !!devices?.length,
  };
};

export const getNodesPlanesBandwidthInAboveBelowThresholdQuery = (
  timestamp?: string,
  threshold?: number,
  operator: '>' | '<',
  isOnHoverFetchingNeeded: boolean,
  devices: string[],
) => {
  const cpuNodesUsagePrometheusQuery = `avg(irate(node_network_receive_bytes_total{device=~"${devices.join(
    '|',
  )}"}[5m])) by (instance,device) ${operator}= ${threshold}`;
  return {
    queryKey: [
      'NodesPlanesBandwidthInAboveBelowThreshold',
      timestamp,
      threshold,
      operator,
      ...devices,
    ],
    queryFn: () => {
      const promPromise = queryPrometheus(
        cpuNodesUsagePrometheusQuery,
        timestamp,
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
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    enabled: !!(
      timestamp &&
      threshold !== undefined &&
      devices?.length &&
      isOnHoverFetchingNeeded
    ),
  };
};

export const getNodesPlanesBandwidthOutAboveBelowThresholdQuery = (
  timestamp?: string,
  threshold?: number,
  operator: '>' | '<',
  isOnHoverFetchingNeeded: boolean,
  devices: string[],
) => {
  const cpuNodesUsagePrometheusQuery = `avg(irate(node_network_transmit_bytes_total{device=~"${devices.join(
    '|',
  )}"}[5m])) by (instance,device) ${operator}= ${threshold}`;
  return {
    queryKey: [
      'NodesPlanesBandwidthOutAboveBelowThreshold',
      timestamp,
      threshold,
      operator,
      ...devices,
    ],
    queryFn: () => {
      const promPromise = queryPrometheus(
        cpuNodesUsagePrometheusQuery,
        timestamp,
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
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    enabled: !!(
      timestamp &&
      threshold !== undefined &&
      devices?.length &&
      isOnHoverFetchingNeeded
    ),
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

export const getNodesThroughputReadQuery = (
  timespanProps: TimeSpanProps,
): typeof useQuery => {
  const nodesThroughputReadQuery = `sum(sum(irate(node_disk_read_bytes_total[1m])) by (instance, device))by(instance)`;
  return getPrometheusQuery(
    ['NodesThroughputReadQuery'],
    nodesThroughputReadQuery,
    timespanProps,
  );
};

export const getNodesThroughputWriteQuery = (
  timespanProps: TimeSpanProps,
): typeof useQuery => {
  const nodesThroughputWriteQuery = `sum(sum(irate(node_disk_written_bytes_total[1m])) by (instance, device))by(instance)`;
  return getPrometheusQuery(
    ['NodesThroughputWriteQuery'],
    nodesThroughputWriteQuery,
    timespanProps,
  );
};

export const getNodesThroughputWriteQuantileQuery = (
  timespanProps: TimeSpanProps,
  quantile: number,
): typeof useQuery => {
  const nodesThroughputWritePromQL = `quantile(${quantile},sum(sum(irate(node_disk_written_bytes_total[1m])) by (instance, device))by(instance))`;
  return getPrometheusQuery(
    ['NodesThroughputWriteQuantile', quantile],
    nodesThroughputWritePromQL,
    timespanProps,
  );
};

export const getNodesThroughputReadQuantileQuery = (
  timespanProps: TimeSpanProps,
  quantile: number,
): typeof useQuery => {
  const nodesThroughputReadPromQL = `quantile(${quantile},sum(sum(irate(node_disk_read_bytes_total[1m])) by (instance, device))by(instance))`;
  return getPrometheusQuery(
    ['NodesThroughputReadQueryQuantile', quantile],
    nodesThroughputReadPromQL,
    timespanProps,
  );
};

export const getNodesThroughputWriteAboveBelowThresholdQuery = (
  timestamp?: string,
  threshold?: number,
  operator: '>' | '<',
  isOnHoverFetchingNeeded: boolean,
) => {
  const nodesThroughputWriteAboveBelowPromQL = `sum(sum(irate(node_disk_written_bytes_total[1m])) by (instance, device))by(instance) ${operator}= ${threshold}`;
  return {
    queryKey: [
      'NodesThroughputWriteAboveBelowThreshold',
      timestamp,
      threshold,
      operator,
    ],
    queryFn: () => {
      const promPromise = queryPrometheus(
        nodesThroughputWriteAboveBelowPromQL,
        timestamp,
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
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    enabled: !!(
      timestamp &&
      threshold !== undefined &&
      isOnHoverFetchingNeeded
    ),
  };
};

export const getNodesThroughputReadAboveBelowThresholdQuery = (
  timestamp?: string,
  threshold?: number,
  operator: '>' | '<',
  isOnHoverFetchingNeeded: boolean,
) => {
  const nodesThroughputReadAboveBelowPromQL = `sum(sum(irate(node_disk_read_bytes_total[1m])) by (instance, device))by(instance) ${operator}= ${threshold}`;
  return {
    queryKey: [
      'NodesThroughputReadBelowThreshold',
      timestamp,
      threshold,
      operator,
    ],
    queryFn: () => {
      const promPromise = queryPrometheus(
        nodesThroughputReadAboveBelowPromQL,
        timestamp,
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
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    enabled: !!(
      timestamp &&
      threshold !== undefined &&
      isOnHoverFetchingNeeded
    ),
  };
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
  const volumeLatencyWriteQuery = `sum(
      irate(node_disk_write_time_seconds_total${prometheusFilters}[5m]) /
      (irate(node_disk_writes_completed_total${prometheusFilters}[5m]) > 0) or
      irate(node_disk_write_time_seconds_total${prometheusFilters}[5m]) > bool 0) * 1000000`;
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
  const volumeLatencyReadQuery = `sum(
    irate(node_disk_read_time_seconds_total${prometheusFilters}[5m]) /
    (irate(node_disk_reads_completed_total${prometheusFilters}[5m]) > 0) or
    irate(node_disk_read_time_seconds_total${prometheusFilters}[5m]) > bool 0) * 1000000`;
  return getPrometheusQuery(
    ['volumeLatencyRead', instanceIp, deviceName],
    volumeLatencyReadQuery,
    timespanProps,
  );
};

// which may cause performance issue
export const getAlertsHistoryQuery = ({
  startingTimeISO,
  currentTimeISO,
  frequency,
}: TimeSpanProps): typeof useQuery => {
  const query = `sum(alertmanager_alerts)`;

  const alertManagerDowntimePromise = queryPrometheusRange(
    startingTimeISO,
    currentTimeISO,
    frequency,
    encodeURIComponent(query),
  )?.then((resolve) => {
    if (resolve.error) {
      throw resolve.error;
    }
    const points = addMissingDataPoint(
      resolve.data.result[0].values,
      Date.parse(startingTimeISO) / 1000,
      Date.parse(currentTimeISO) / 1000 - Date.parse(startingTimeISO) / 1000,
      frequency,
    );

    return getNaNSegments(points).map((segment) => ({
      startsAt: new Date(segment.startsAt * 1000).toISOString(),
      endsAt: new Date(segment.endsAt * 1000).toISOString(),
      severity: 'unavailable',
      id: `unavailable-${segment.startsAt}`,
      labels: { alertname: 'ClusterDegraded' },
      description:
        'Alerting services were unavailable during this period of time',
    }));
  });

  return {
    queryKey: ['alertsHistory', startingTimeISO],
    queryFn: () => {
      return Promise.all([
        getFormattedLokiAlert(startingTimeISO, currentTimeISO),
        alertManagerDowntimePromise,
      ]).then(([alerts, downTimes]) => {
        const rawAlerts = [
          ...alerts.map((alert) => {
            if (alert.endsAt === null) {
              const endsAtSegment = downTimes.find(
                (downTime) => downTime.startsAt > alert.startsAt,
              ) || { startsAt: new Date().toISOString() };
              return { ...alert, endsAt: endsAtSegment.startsAt };
            }
            return alert;
          }),
          ...downTimes,
        ];

        rawAlerts.sort((alertA, alertB) =>
          alertB.startsAt > alertA.startsAt ? -1 : 1,
        );
        return rawAlerts;
      });
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  };
};

function convertSegmentToAlert(segment) {
  const baseSegment = {
    startsAt: new Date(segment.startsAt * 1000).toISOString(),
    endsAt: segment.endsAt
      ? new Date(segment.endsAt * 1000).toISOString()
      : new Date().toISOString(),
    severity: segment.type,
    id: `${segment.type}-${segment.startsAt}`,
  };
  switch (segment.type) {
    default:
      return { ...baseSegment };
    case STATUS_WARNING:
      return {
        ...baseSegment,

        labels: {
          alertname: 'ClusterDegraded',
        },
        description: 'The cluster is degraded',
      };
    case STATUS_CRITICAL:
      return {
        ...baseSegment,

        labels: {
          alertname: 'ClusterAtRisk',
        },
        description: 'The cluster is at risk',
      };

    case NAN_STRING:
      return {
        ...baseSegment,
        severity: 'unavailable',
        description:
          'Alerting services were unavailable during this period of time',
      };
  }
}

// Call Prometheus endpoint to get the segments {description: string, startsAt: string, endsAt: string, severity: string}
// for Cluster alert which will be used by Global Health Component
export const getClusterAlertSegmentQuery = (
  duration: number,
): typeof useQuery => {
  // We add watchdog alert to identify unavailble segments
  const query = `sum by(alertname) (ALERTS{alertname=~'ClusterAtRisk|ClusterDegraded|Watchdog', alertstate='firing'})`;
  // set the frequency to 60s only for global health component to get the precise segments
  const frequency = 60;

  const clusterAlertNumberPromise = ({
    startingTimeISO,
    currentTimeISO,
    frequency,
  }: TimeSpanProps) =>
    queryPrometheusRange(
      startingTimeISO,
      currentTimeISO,
      frequency,
      encodeURIComponent(query),
    )?.then((resolve) => {
      if (resolve.error) {
        throw resolve.error;
      }
      const clusterAtRiskResult = resolve.data.result.find(
        (result) => result.metric.alertname === 'ClusterAtRisk',
      ) || { values: [] };
      const clusterDegradedResult = resolve.data.result.find(
        (result) => result.metric.alertname === 'ClusterDegraded',
      ) || { values: [] };
      const watchdogResult = resolve.data.result.find(
        (result) => result.metric.alertname === 'Watchdog',
      );
      const pointsAtRisk = addMissingDataPoint(
        clusterAtRiskResult.values,
        Date.parse(startingTimeISO) / 1000,
        Date.parse(currentTimeISO) / 1000 - Date.parse(startingTimeISO) / 1000,
        frequency,
      );
      const pointsDegraded = addMissingDataPoint(
        clusterDegradedResult.values,
        Date.parse(startingTimeISO) / 1000,
        Date.parse(currentTimeISO) / 1000 - Date.parse(startingTimeISO) / 1000,
        frequency,
      );
      const pointsWatchdog = addMissingDataPoint(
        watchdogResult.values,
        Date.parse(startingTimeISO) / 1000,
        Date.parse(currentTimeISO) / 1000 - Date.parse(startingTimeISO) / 1000,
        frequency,
      );

      return getSegments({ pointsDegraded, pointsAtRisk, pointsWatchdog }).map(
        convertSegmentToAlert,
      );
    });

  return {
    queryKey: ['clusterAlertsNumber', duration],
    queryFn: () => {
      const now = new Date().getTime();
      const endTime = now - (now % (frequency * 1000)); //round minute of current time to make sure we have the same points in the result
      const startingTimeISO = new Date(
        (endTime / 1000 - duration) * 1000,
      ).toISOString();
      const currentTimeISO = new Date(endTime).toISOString();

      return clusterAlertNumberPromise({
        startingTimeISO,
        currentTimeISO,
        frequency,
      });
    },
    refetchInterval: frequency * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  };
};
