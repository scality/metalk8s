//import { fromUnixTimestampToDate } from './utils';
import type {
  PrometheusQueryResult,
  RangeMatrixResult,
} from './prometheus/api';
import { PORT_NODE_EXPORTER } from '../constants';
export type Series = {
  label: string,
  data: { timestamp: number, value: number }[],
}[];
export type FormattedChartNodePromRange = {
  date: Date,
  type: string,
  y: string,
};
export type FormattedChartNodesPromRange = Array<FormattedChartNodePromRange>;

// Format the prometheus data to Series
// if the graph is in loading status, the
export const formatNodesPromRangeForChart = (
  results: Promise<PrometheusQueryResult>[],
  nodes: Array<{ internalIP: string, name: string }>,
  isLoading: boolean,
): Series => {
  return nodes.map((node, index) => {
    const internalIP = node.internalIP;
    const matrixResult: RangeMatrixResult =
      results?.find(
        (i) =>
          i?.data?.result[0]?.metric?.instance ===
          `${internalIP}:${PORT_NODE_EXPORTER}`,
      )?.data?.result[0] || results[index]?.data.result[0]; // for the memory, the metric field is empty :(

    const prometheusData = matrixResult?.values; //[number,string][] => {number,string}[] // no need any more

    return {
      data: prometheusData,
      resource: node.name,
      getTooltipLabel: (_, resource: node.name) => {
        return node.name;
      },
      getLegendLabel: (_, resource: node.name) => {
        return node.name;
      },
    };
  });
};

// Format prometheus data to read/write format
export const formatNodesThroughputPromRangeForChart = (
  results: Promise<PrometheusQueryResult>[],
  nodes: Array<{ internalIP: string, name: string }>,
): Series => {
  const readRes = results[0];
  const writeRes = results[1];

  if (
    readRes &&
    readRes.status === 'success' &&
    writeRes &&
    writeRes.status === 'success'
  ) {
    const tempRead = nodes.map((node) => {
      const nodeReadData = readRes?.data?.result?.find(
        (item) => item.metric?.instance.split(':')[0] === node.internalIP,
      );
      const prometheusReadData = nodeReadData?.values;

      return {
        metricPrefix: 'read',
        data: prometheusReadData,
        resource: node.name,
        getTooltipLabel: (metricPrefix: 'read', resource: node.name) => {
          return `${resource}-${metricPrefix}`;
        },
        getLegendLabel: (_, resource: node.name) => {
          return node.name;
        },
      };
    });

    const tempWrite = nodes.map((node) => {
      const nodeWriteData = writeRes?.data?.result?.find(
        (item) => item.metric?.instance.split(':')[0] === node.internalIP,
      );

      const prometheusWriteData = nodeWriteData?.values;
      return {
        metricPrefix: 'write',
        data: prometheusWriteData,
        resource: node.name,
        getTooltipLabel: (metricPrefix: 'read', resource: node.name) => {
          return `${resource}-${metricPrefix}`;
        },
        getLegendLabel: (_, resource: node.name) => {
          return node.name;
        },
      };
    });

    return tempRead.concat(tempWrite);
  }
};
