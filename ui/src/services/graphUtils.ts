import type {
  PrometheusQueryResult,
  RangeMatrixResult,
} from './prometheus/api';
import {
  CHART_COLOR_VALUES,
  lineColor1,
  PORT_NODE_EXPORTER,
} from '../constants';

import type { Serie } from '@scality/core-ui/dist/components/linetimeseriechart/linetimeseriechart.component';
import {
  lineColor3,
  lineColor4,
  lineColor5,
  lineColor6,
  lineColor7,
  lineColor8,
} from '@scality/core-ui/dist/style/theme';

export const getMultiResourceSeriesForChart = (
  results: PrometheusQueryResult,
  nodes: Array<{
    internalIP: string;
    name: string;
  }>,
): Serie[] => {
  if (results.status !== 'success') {
    throw new Error('Failed to fetch data from Prometheus');
  }
  return nodes.map((node, index) => {
    const internalIP = node.internalIP;
    if (results.data.resultType !== 'matrix') {
      throw new Error('Failed to fetch data from Prometheus');
    }
    const matrixResult: RangeMatrixResult['result'][number] =
      results?.data?.result?.find(
        (i) => i?.metric?.instance === `${internalIP}:${PORT_NODE_EXPORTER}`,
      ) || results[index];
    return convertMatrixResultToSerie(matrixResult, node.name);
  });
};
// UPDATED: fiterMetricValues - Add error handling and proper typing
export const fiterMetricValues = (
  prometheusResult: PrometheusQueryResult,
  labels: {
    instance: string;
    device?: string;
  },
): RangeMatrixResult['result'][number] => {
  if (prometheusResult.status !== 'success') {
    throw new Error('Failed to fetch data from Prometheus');
  }
  if (prometheusResult.data.resultType !== 'matrix') {
    throw new Error('Failed to fetch data from Prometheus');
  }
  if (Object.prototype.hasOwnProperty.call(labels, 'device')) {
    return prometheusResult.data?.result.find(
      (item) =>
        item.metric.instance === labels.instance &&
        item.metric.device === labels.device,
    );
  }

  return prometheusResult.data.result.find(
    (item) => item.metric.instance === labels.instance,
  );
};
// to retrieve Q90, median and Q5 for symmetrical chart
export const getQuantileSymmetricalSeries = (
  resultAbove: PrometheusQueryResult[],
  resultBelow: PrometheusQueryResult[],
  metricPrefixAbove: string,
  metricPrefixBelow: string,
) => {
  return [
    {
      ...convertPrometheusResultToSerie(resultAbove[2], 'Q90'),
      metricPrefix: metricPrefixAbove,
      getLegendLabel: (metricPrefix: string, resource) => {
        return `${resource}-${metricPrefix}`;
      },
      getTooltipLabel: (metricPrefix: string, resource: string) => {
        return `${resource}-${metricPrefix}`;
      },
      color: lineColor3,
    },
    {
      ...convertPrometheusResultToSerie(resultAbove[1], 'Median'),
      metricPrefix: metricPrefixAbove,
      getLegendLabel: (metricPrefix: string, resource) => {
        return `${resource}-${metricPrefix}`;
      },
      getTooltipLabel: (metricPrefix: string, resource: string) => {
        return `${resource}-${metricPrefix}`;
      },
      color: lineColor5,
    },
    {
      ...convertPrometheusResultToSerie(resultAbove[0], 'Q5'),
      metricPrefix: metricPrefixAbove,
      getLegendLabel: (metricPrefix: string, resource) => {
        return `${resource}-${metricPrefix}`;
      },
      getTooltipLabel: (metricPrefix: string, resource: string) => {
        return `${resource}-${metricPrefix}`;
      },
      color: lineColor4,
    },
    {
      ...convertPrometheusResultToSerie(resultBelow[0], 'Q5'),
      getLegendLabel: (metricPrefix: string, resource) => {
        return `${resource}-${metricPrefix}`;
      },
      metricPrefix: metricPrefixBelow,
      getTooltipLabel: (metricPrefix: string, resource: string) => {
        return `${resource}-${metricPrefix}`;
      },
      color: lineColor6,
    },
    {
      ...convertPrometheusResultToSerie(resultBelow[1], 'Median'),
      getLegendLabel: (metricPrefix: string, resource) => {
        return `${resource}-${metricPrefix}`;
      },
      metricPrefix: metricPrefixBelow,
      getTooltipLabel: (metricPrefix: string, resource: string) => {
        return `${resource}-${metricPrefix}`;
      },
      color: lineColor8,
    },
    {
      ...convertPrometheusResultToSerie(resultBelow[2], 'Q90'),
      getLegendLabel: (metricPrefix: string, resource) => {
        return `${resource}-${metricPrefix}`;
      },
      metricPrefix: metricPrefixBelow,
      getTooltipLabel: (metricPrefix: string, resource: string) => {
        return `${resource}-${metricPrefix}`;
      },
      color: lineColor7,
    },
  ];
};

export const getMultipleSymmetricalSeries = (
  resultAbove: PrometheusQueryResult,
  resultBelow: PrometheusQueryResult,
  metricPrefixAbove: string,
  metricPrefixBelow: string,
  nodes: Array<{
    internalIP: string;
    name: string;
  }>,
  nodesPlaneInterface?: Record<
    string,
    {
      interface: string;
    }
  >,
): { above: Serie[]; below: Serie[] } => {
  if (resultAbove.status !== 'success' || resultBelow.status !== 'success') {
    throw new Error('Failed to fetch data from Prometheus');
  }
  return nodes.reduce(
    (acc, node) => {
      const filterLabels = {
        instance: `${node.internalIP}:${PORT_NODE_EXPORTER}`,
        device: undefined,
      };

      if (nodesPlaneInterface) {
        filterLabels.device = nodesPlaneInterface?.[node.name]?.interface;
      }

      const aboveData = fiterMetricValues(resultAbove, filterLabels);
      const belowData = fiterMetricValues(resultBelow, filterLabels);
      return {
        above: [
          ...acc.above,
          {
            ...convertMatrixResultToSerie(aboveData, node.name),
            metricPrefix: metricPrefixAbove,
            getTooltipLabel: (metricPrefix: string, resource: string) => {
              return `${resource}-${metricPrefix}`;
            },
          },
        ],
        below: [
          ...acc.below,
          {
            ...convertMatrixResultToSerie(belowData, node.name),
            metricPrefix: metricPrefixBelow,
            getTooltipLabel: (metricPrefix: string, resource: string) => {
              return `${resource}-${metricPrefix}`;
            },
            renderTooltipSerie: (serie) => {
              return `${serie.resource}-${serie.metricPrefix}`;
            },
          },
        ],
      };
    },
    { above: [], below: [] },
  );
};

const convertMatrixResultToSerie = (
  matrixResult: RangeMatrixResult['result'][0],
  resource: string,
): Serie => {
  const prometheusData = matrixResult?.values ?? [];
  return {
    data: prometheusData,
    resource,
    getTooltipLabel: (_, resource) => {
      return resource;
    },
    isLineDashed: false,
  };
};

// return a single serie
export const convertPrometheusResultToSerie = (
  result: PrometheusQueryResult,
  serieName: string,
): Serie => {
  if (
    result &&
    result.status === 'success' &&
    result.data.resultType === 'matrix'
  ) {
    console.log('DEBUG convertPrometheusResultToSerie', result, serieName);
    const matrixResult: RangeMatrixResult['result'][number] =
      result?.data?.result[0];
    return convertMatrixResultToSerie(matrixResult, serieName);
  }

  return convertMatrixResultToSerie(
    {
      metric: {
        instance: '',
      },
      values: [],
    },
    serieName,
  );
};
// used only by the node metrics chart
export const convertPrometheusResultToSerieWithAverage = (
  result: PrometheusQueryResult,
  serieName: string,
  resultAvg?: PrometheusQueryResult,
): Serie[] => {
  const series = [
    {
      ...convertPrometheusResultToSerie(result, serieName),
      color: resultAvg ? lineColor1 : undefined, // when we display the average, average serie color should match with the metric color
    },
  ];

  if (resultAvg) {
    series.push({
      ...convertPrometheusResultToSerie(resultAvg, 'Cluster Avg.'),
      color: lineColor1,
      isLineDashed: true,
    });
  }

  return series;
};

export const getSeriesForSymmetricalChart = (
  resultAbove: PrometheusQueryResult,
  resultBelow: PrometheusQueryResult,
  resource: string,
  metricPrefixAbove: string,
  metricPrefixBelow: string,
  resultAvgAbove?: PrometheusQueryResult,
  resultAvgBelow?: PrometheusQueryResult,
): { above: Serie[]; below: Serie[] } => {
  const series = {
    above: [],
    below: [],
  };

  if (
    resultAbove &&
    resultAbove.status === 'success' &&
    resultAbove.data.resultType === 'matrix'
  ) {
    const serieAbove = {
      metricPrefix: metricPrefixAbove,
      data: resultAbove?.data?.result[0]?.values || [],
      resource,
      getTooltipLabel: (metricPrefix, resource) => {
        return `${resource}-${metricPrefix}`;
      },
    };
    series.above.push(serieAbove);
  }

  if (
    resultBelow &&
    resultBelow.status === 'success' &&
    resultBelow.data.resultType === 'matrix'
  ) {
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
    };
    series.below.push(serieBelow);
  }

  // show cluster average is activated
  if (
    resultAvgAbove &&
    resultAvgAbove.status === 'success' &&
    resultAvgAbove.data.resultType === 'matrix'
  ) {
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
    };
    series.above.push(serieAvgAbove);
  }

  if (
    resultAvgBelow &&
    resultAvgBelow.status === 'success' &&
    resultAvgBelow.data.resultType === 'matrix'
  ) {
    // the negative value
    if (resultAvgBelow.data.resultType !== 'matrix') {
      throw new Error('Failed to fetch data from Prometheus');
    }
    const serieAvgBelow = {
      metricPrefix: metricPrefixBelow,
      data: resultAvgBelow?.data?.result[0]?.values || [],
      resource: 'Cluster Avg.',
      getTooltipLabel: (metricPrefix, resource) => {
        return `${resource}-${metricPrefix}`;
      },
    };
    series.below.push(serieAvgBelow);
  }

  return {
    above: series.above,
    below: series.below,
  };
};
export const getNodesInterfacesString = (nodeIPsInfo): [] => {
  const interfaces = Object.values(nodeIPsInfo).flatMap((plane) => [
    // @ts-expect-error - FIXME when you are working on it
    plane?.controlPlane?.interface,
    // @ts-expect-error - FIXME when you are working on it
    plane?.workloadPlane?.interface,
  ]);
  const uniqueInterfaces = [...new Set(interfaces)];
  // @ts-expect-error - FIXME when you are working on it
  return uniqueInterfaces;
};

export const renderTooltipSeperationLine = (seperationLineColor) => {
  return `</table><hr style="border-color: ${seperationLineColor};"/><table>`;
};

// Shared function to create color mapping for chart series
export const createColorSet = (
  seriesNames: string[],
): Record<string, string> => {
  const colorMapping: Record<string, string> = {};
  seriesNames.forEach((name, index) => {
    // Cycle through available colors
    const colorIndex = index % CHART_COLOR_VALUES.length;
    colorMapping[name] = CHART_COLOR_VALUES[colorIndex];
  });
  return colorMapping;
};
