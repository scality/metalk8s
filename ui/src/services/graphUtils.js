import { fromUnixTimestampToDate } from './utils';
import type {
  PrometheusQueryResult,
  RangeMatrixResult,
} from './prometheus/api';
import { lineColor1 } from '../constants';
import { type Serie } from '@scality/core-ui/dist/components/linetemporalchart/LineTemporalChart.component';
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

export const getSingleResourceSerie = (
  result: PrometheusQueryResult,
  resource: string,
  resultAvg?: PrometheusQueryResult,
): Serie[] => {
  const series = [];

  if (result && result.status === 'success') {
    const matrixResult: RangeMatrixResult = result?.data?.result[0];
    const prometheusData = matrixResult?.values ?? [];
    const singleSerie = {
      data: prometheusData,
      resource,
      getTooltipLabel: (_, resource) => {
        return resource;
      },
      getLegendLabel: (_, resource) => {
        return resource;
      },
      isLineDashed: false,
      color: lineColor1,
    };
    series.push(singleSerie);
  }

  if (resultAvg && resultAvg.status === 'success') {
    const avgMatrixResult = resultAvg?.data?.result[0];
    const prometheusAvgData = avgMatrixResult?.values ?? [];
    series.push({
      data: prometheusAvgData,
      resource: 'Cluster Avg.',
      getTooltipLabel: (_, resource) => {
        return resource;
      },
      getLegendLabel: (_, resource) => {
        return resource;
      },
      isLineDashed: true,
      color: lineColor1,
    });
  }
  return series;
};

// get the series for symmetrical charts
export const getSeriesForSymmetricalChart = (
  resultAbove: PrometheusQueryResult,
  resultBelow: PrometheusQueryResult,
  resource: string,
  metricPrefixAbove: string,
  metricPrefixBelow: string,
  resultAvgAbove?: PrometheusQueryResult,
  resultAvgBelow?: PrometheusQueryResult,
): Serie[] => {
  const series = [];

  if (resultAbove && resultAbove.status === 'success') {
    const serieAbove = {
      metricPrefix: metricPrefixAbove,
      data: resultAbove?.data?.result[0]?.values || [],
      resource,
      getTooltipLabel: (metricPrefix, resource) => {
        return `${resource}-${metricPrefix}`;
      },
      color: lineColor1,
    };
    series.push(serieAbove);
  }
  if (resultBelow && resultBelow.status === 'success') {
    const serieBelow = {
      metricPrefix: metricPrefixBelow,
      data: resultBelow?.data?.result[0]?.values || [],
      resource,
      getTooltipLabel: (metricPrefix, resource) => {
        return `${resource}-${metricPrefix}`;
      },
      // For the legend, we display only two labels for the symmetrical chart: One is the `${node_name}`, the other is `Cluster Avg.`
      getLegendLabel: (_, resource) => {
        return `${resource}`;
      },
      color: lineColor1,
    };
    series.push(serieBelow);
  }

  // show cluster average is activated
  if (resultAvgAbove && resultAvgAbove.status === 'success') {
    const serieAvgAbove = {
      metricPrefix: metricPrefixAbove,
      data: resultAvgAbove?.data?.result[0]?.values || [],
      resource: 'Cluster Avg.',
      getTooltipLabel: (metricPrefix, resource) => {
        return `${resource}-${metricPrefix}`;
      },
      getLegendLabel: (_, resource) => {
        return `${resource}`;
      },
      color: lineColor1,
      isLineDashed: true,
    };
    series.push(serieAvgAbove);
  }
  if (resultAvgBelow && resultAvgBelow.status === 'success') {
    // the negative value
    const serieAvgBelow = {
      metricPrefix: metricPrefixBelow,
      data: resultAvgBelow?.data?.result[0]?.values || [],
      resource: 'Cluster Avg.',
      getTooltipLabel: (metricPrefix, resource) => {
        return `${resource}-${metricPrefix}`;
      },
      color: lineColor1,
      isLineDashed: true,
    };

    series.push(serieAvgBelow);
  }
  return series;
};
