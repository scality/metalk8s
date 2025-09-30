import type {
  PrometheusQueryResult,
  RangeMatrixResult,
} from './prometheus/api';
import {
  CHART_COLOR_VALUES,
  CLUSTER_AVERAGE,
  lineColor2,
  lineColor3,
  lineColor4,
  lineColor5,
  lineColor6,
  lineColor7,
  PORT_NODE_EXPORTER,
  SAMPLE_FREQUENCY_LAST_ONE_HOUR,
  SAMPLE_FREQUENCY_LAST_SEVEN_DAYS,
  SAMPLE_FREQUENCY_LAST_TWENTY_FOUR_HOURS,
} from '../constants';

import type { Serie } from '@scality/core-ui/dist/components/linetimeseriechart/linetimeseriechart.component';

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
// Results are in ascending order: [Q05, Q50, Q90]
export const getQuantileSymmetricalSeries = (
  resultAbove: PrometheusQueryResult[],
  resultBelow: PrometheusQueryResult[],
  metricPrefixAbove: string,
  metricPrefixBelow: string,
): {
  above: Serie[];
  below: Serie[];
} => {
  return {
    above: [
      {
        ...convertPrometheusResultToSerie(
          resultAbove[2],
          `Q90-${metricPrefixAbove}`,
        ),
        metricPrefix: metricPrefixAbove,
      },
      {
        ...convertPrometheusResultToSerie(
          resultAbove[1],
          `Median-${metricPrefixAbove}`,
        ),
        metricPrefix: metricPrefixAbove,
      },
      {
        ...convertPrometheusResultToSerie(
          resultAbove[0],
          `Q5-${metricPrefixAbove}`,
        ),
        metricPrefix: metricPrefixAbove,
      },
    ],
    below: [
      {
        ...convertPrometheusResultToSerie(
          resultBelow[0],
          `Q5-${metricPrefixBelow}`,
        ),

        metricPrefix: metricPrefixBelow,
      },
      {
        ...convertPrometheusResultToSerie(
          resultBelow[1],
          `Median-${metricPrefixBelow}`,
        ),

        metricPrefix: metricPrefixBelow,
      },
      {
        ...convertPrometheusResultToSerie(
          resultBelow[2],
          `Q90-${metricPrefixBelow}`,
        ),

        metricPrefix: metricPrefixBelow,
      },
    ],
  };
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
    },
  ];

  if (resultAvg) {
    series.push({
      ...convertPrometheusResultToSerie(resultAvg, CLUSTER_AVERAGE),
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
      resource: CLUSTER_AVERAGE,
      getTooltipLabel: (metricPrefix, resource) => {
        return `${resource}-${metricPrefix}`;
      },
      isLineDashed: true,
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
      isLineDashed: true,
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

// Custom color mapping for symmetrical quantile chart
export const createSymmetricalQuantileColorSet = (
  aboveSeries: any[],
  belowSeries: any[],
): Record<string, string> => {
  const colorMapping: Record<string, string> = {};

  // Above series colors: Q90 = cyan, Median = yellow, Q5 = blue
  aboveSeries.forEach((serie) => {
    const name = serie.resource || serie.name;
    if (name.includes('Q90')) {
      colorMapping[name] = lineColor3; // cyan
    } else if (name.includes('Median')) {
      colorMapping[name] = lineColor5;
    } else if (name.includes('Q5')) {
      colorMapping[name] = lineColor4; // blue
    }
  });

  // Below series colors: Q5 = red, Median = gold, Q90 = orange
  belowSeries.forEach((serie) => {
    const name = serie.resource || serie.name;
    if (name.includes('Q5')) {
      colorMapping[name] = lineColor6; // red
    } else if (name.includes('Median')) {
      colorMapping[name] = lineColor2; // gold
    } else if (name.includes('Q90')) {
      colorMapping[name] = lineColor7; // orange
    }
  });

  return colorMapping;
};

// Utility function to determine time format based on interval
export const getTimeFormatForInterval = (
  interval: number,
):
  | 'day-month-abbreviated-hour-minute'
  | 'day-month-abbreviated-hour-minute-second'
  | 'long-date-without-weekday' => {
  if (
    interval === SAMPLE_FREQUENCY_LAST_SEVEN_DAYS ||
    interval === SAMPLE_FREQUENCY_LAST_TWENTY_FOUR_HOURS
  ) {
    return 'day-month-abbreviated-hour-minute';
  }
  if (interval === SAMPLE_FREQUENCY_LAST_ONE_HOUR) {
    return 'day-month-abbreviated-hour-minute-second';
  }
  return 'long-date-without-weekday';
};
