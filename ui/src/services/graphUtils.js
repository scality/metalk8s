import { fromUnixTimestampToDate } from './utils';
import type {
  PrometheusQueryResult,
  RangeMatrixResult,
} from './prometheus/api';

export type FormattedChartNodePromRange = {
  date: Date,
  type: string,
  y: string,
};
export type FormattedChartNodesPromRange = Array<FormattedChartNodePromRange>;
export const formatNodesPromRangeForChart = (
  result: Promise<PrometheusQueryResult>[],
  nodes: Array<{ internalIP: string, name: string }>,
): FormattedChartNodesPromRange => {
  const reduced = nodes.reduce((acc, node, index) => {
    let temp = [];
    if (
      result[index] &&
      result[index].status === 'success' &&
      result[index].data.result[0] &&
      result[index].data.result[0].values.length
    ) {
      const matrixResult: RangeMatrixResult = result[index].data;
      temp = matrixResult.result[0].values.map((item) => ({
        date: fromUnixTimestampToDate(item[0]),
        type: node.name,
        y: item[1],
      }));
    }
    return acc.concat(temp);
  }, []);
  return reduced;
};

export const formatNodesThroughputPromRangeForChart = (
  result: Promise<PrometheusQueryResult>[],
  nodes: Array<{ internalIP: string, name: string }>,
): FormattedChartNodesPromRange => {
  const readRes = result[0];
  const writeRes = result[1];

  if (
    readRes &&
    readRes.status === 'success' &&
    writeRes &&
    writeRes.status === 'success'
  ) {
    const reduced = nodes.reduce((acc, node) => {
      let tempRead = [];
      let tempWrite = [];

      const nodeReadData = readRes.data?.result?.find(
        (item) => item.metric?.instance.split(':')[0] === node.internalIP,
      );
      const nodeWriteData = writeRes.data?.result?.find(
        (item) => item.metric?.instance.split(':')[0] === node.internalIP,
      );

      if (nodeReadData)
        tempRead = nodeReadData.values.map((item) => ({
          date: fromUnixTimestampToDate(item[0]),
          type: `${node.name}-read`,
          y: 0 - item[1],
        }));
      if (nodeWriteData)
        tempWrite = nodeWriteData.values.map((item) => ({
          date: fromUnixTimestampToDate(item[0]),
          type: `${node.name}-write`,
          y: item[1],
        }));

      return acc.concat(tempRead).concat(tempWrite);
    }, []);
    return reduced;
  }

  return null;
};
