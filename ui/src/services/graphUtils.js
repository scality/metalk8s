import type {
  PrometheusQueryResult,
  RangeMatrixResult,
} from './prometheus/api';
import { lineColor1, PORT_NODE_EXPORTER } from '../constants';
import { type Serie } from '@scality/core-ui/dist/components/linetemporalchart/LineTemporalChart.component';

export const getMultiResourceSeriesForChart = (
  results: PrometheusQueryResult,
  nodes: Array<{ internalIP: string, name: string }>,
): Serie[] => {
  return nodes.map((node, index) => {
    const internalIP = node.internalIP;
    const matrixResult: RangeMatrixResult =
      results?.data?.result?.find(
        (i) => i?.metric?.instance === `${internalIP}:${PORT_NODE_EXPORTER}`,
      ) || results[index];

    return convertMatrixResultToSerie(matrixResult, node.name);
  });
};

export const getMultipleSymmetricalSeries = (
  resultAbove: PrometheusQueryResult,
  resultBelow: PrometheusQueryResult,
  metricPrefixAbove: string,
  metricPrefixBelow: string,
  nodes: Array<{ internalIP: string, name: string }>,
): Serie[] => {
  // TODO: Throw the error if we got error status from Promethues API, and handle the error at React-query level
  return nodes.flatMap((node) => {
    const aboveData = resultAbove?.data?.result?.find(
      (item) =>
        item.metric?.instance === `${node.internalIP}:${PORT_NODE_EXPORTER}`,
    );

    const belowData = resultBelow?.data?.result?.find(
      (item) =>
        item.metric?.instance === `${node.internalIP}:${PORT_NODE_EXPORTER}`,
    );

    return [
      {
        ...convertMatrixResultToSerie(aboveData, node.name),
        metricPrefix: metricPrefixAbove,
        getTooltipLabel: (metricPrefix: string, resource: string) => {
          return `${resource}-${metricPrefix}`;
        },
      },
      {
        ...convertMatrixResultToSerie(belowData, node.name),
        metricPrefix: metricPrefixBelow,
        getTooltipLabel: (metricPrefix: string, resource: string) => {
          return `${resource}-${metricPrefix}`;
        },
        getLegendLabel: null, //disable legend to avoid duplicated entries
      },
    ];
  });
};

const convertMatrixResultToSerie = (
  matrixResult: RangeMatrixResult,
  resource: string,
): Serie => {
  const prometheusData = matrixResult?.values ?? [];
  return {
    data: prometheusData,
    resource,
    getTooltipLabel: (_, resource) => {
      return resource;
    },
    getLegendLabel: (_, resource) => {
      return resource;
    },
    isLineDashed: false,
  };
};

export const getSingleResourceSerie = (
  result: PrometheusQueryResult,
  resource: string,
  resultAvg?: PrometheusQueryResult,
): Serie[] => {
  const series = [];

  if (result && result.status === 'success') {
    const matrixResult: RangeMatrixResult = result?.data?.result[0];

    const singleSerie = {
      ...convertMatrixResultToSerie(matrixResult, resource),
      color: resultAvg ? lineColor1 : undefined, // when we display the average, average serie color should match with the metric color
    };
    series.push(singleSerie);
  }

  if (resultAvg && resultAvg.status === 'success') {
    const avgMatrixResult = resultAvg?.data?.result[0];

    series.push({
      ...convertMatrixResultToSerie(avgMatrixResult, 'Cluster Avg.'),
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
