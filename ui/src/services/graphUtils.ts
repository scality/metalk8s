import type {
  PrometheusQueryResult,
  RangeMatrixResult,
} from './prometheus/api';
import { lineColor1, PORT_NODE_EXPORTER } from '../constants';
import type { Serie } from '@scality/core-ui/dist/components/linetemporalchart/LineTemporalChart.component';
import '@scality/core-ui/dist/components/linetemporalchart/LineTemporalChart.component';
import {
  spacing,
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
  return nodes.map((node, index) => {
    const internalIP = node.internalIP;
    const matrixResult: RangeMatrixResult =
      // @ts-expect-error - FIXME when you are working on it
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
): RangeMatrixResult => {
  if (Object.prototype.hasOwnProperty.call(labels, 'device')) {
    // @ts-expect-error - FIXME when you are working on it
    return prometheusResult.data?.result.find(
      (item) =>
        item.metric.instance === labels.instance &&
        item.metric.device === labels.device,
    );
  }

  // @ts-expect-error - FIXME when you are working on it
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
): Serie[] => {
  // TODO: Throw the error if we got error status from Promethues API, and handle the error at React-query level
  return nodes
    .flatMap((node) => {
      const filterLabels = {
        instance: `${node.internalIP}:${PORT_NODE_EXPORTER}`,
      };

      if (nodesPlaneInterface) {
        // @ts-expect-error - FIXME when you are working on it
        filterLabels.device = nodesPlaneInterface?.[node.name]?.interface;
      }

      const aboveData = fiterMetricValues(resultAbove, filterLabels);
      const belowData = fiterMetricValues(resultBelow, filterLabels);
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
    })
    .sort((serieA, serieB) => {
      if (
        serieA.metricPrefix === metricPrefixAbove &&
        serieB.metricPrefix === metricPrefixBelow
      ) {
        return -1;
      }

      if (
        serieA.metricPrefix === metricPrefixBelow &&
        serieB.metricPrefix === metricPrefixAbove
      ) {
        return 1;
      }

      return 0;
    });
};

const convertMatrixResultToSerie = (
  matrixResult: RangeMatrixResult,
  resource: string,
): Serie => {
  // @ts-expect-error - FIXME when you are working on it
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

// return a single serie
export const convertPrometheusResultToSerie = (
  result: PrometheusQueryResult,
  serieName: string,
): Serie => {
  if (result && result.status === 'success') {
    // @ts-expect-error - FIXME when you are working on it
    const matrixResult: RangeMatrixResult = result?.data?.result[0];
    return convertMatrixResultToSerie(matrixResult, serieName);
  }

  return convertMatrixResultToSerie(
    {
      result: [],
      // @ts-expect-error - FIXME when you are working on it
      resultType: 'Matrix',
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
      // @ts-expect-error - FIXME when you are working on it
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
      // @ts-expect-error - FIXME when you are working on it
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
      // @ts-expect-error - FIXME when you are working on it
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
      // @ts-expect-error - FIXME when you are working on it
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
export function renderTooltipSerie({
  color,
  isLineDashed,
  name,
  value,
  key,
}: {
  color?: string;
  isLineDashed?: boolean;
  name: string;
  value: string;
  key: string;
}) {
  return `<tr>
    <td class="color" style="width: 1rem;">
    ${
      color !== undefined
        ? `<span style='background: ${
            isLineDashed
              ? `repeating-linear-gradient(to right,${color} 0,${color} ${spacing.sp1},transparent ${spacing.sp1},transparent ${spacing.sp2})`
              : color
          };width: ${spacing.sp8};height:${
            spacing.sp2
          };display: inline-block;vertical-align: middle;'></span>`
        : ''
    }
    </td>
    <td style="text-align: left;">
        ${name}
    </td>
    <td class="value" style="text-align: right;min-width: 5rem;display: table-cell;">
      ${value}
    </td>
  </tr>`;
}
export const renderQuantileData = (
  isIdle,
  isLoading,
  isSuccess,
  isError,
  data,
  nodeMapPerIp,
  theme,
  valueBase,
  unitLabel,
  intl,
) => {
  const hoverQuantileValue = (data) => {
    return unitLabel
      ? // @ts-expect-error - FIXME when you are working on it
        `${parseFloat(data.value[1] / (valueBase || 1)).toFixed(
          2,
        )} ${unitLabel}`
      : // @ts-expect-error - FIXME when you are working on it
        `${parseFloat(data.value[1] / (valueBase || 1)).toFixed(2)}`;
  };

  return `${
    isLoading || isIdle
      ? `<tr style="color: ${theme.textSecondary}"><td></td><td colspan='2' style="padding-left: 1rem;">Loading...</td></tr>`
      : ''
  }
  ${
    isSuccess
      ? data?.data?.result
          ?.map(
            (data) =>
              `<tr style="color: ${
                theme.textSecondary
              }"><td></td><td style="padding-left: 1rem;padding-right: 0.5rem;">${
                nodeMapPerIp[data.metric.instance]
              }</td><td class="value" style="text-align: right;display: table-cell;">${hoverQuantileValue(
                data,
              )}</td></tr>`,
          )
          .join('')
      : ''
  }
  ${isError ? intl.formatMessage('error_occur_outpassing_threshold') : ''}
  `;
};
export const renderOutpassingThresholdTitle = (
  title,
  isOutpassingDataDisplayed,
  theme,
) => {
  // Hide the Outpassing threshold node list when isOnHoverFetchingNeeded is false
  return isOutpassingDataDisplayed
    ? `<tr style="color: ${theme.textSecondary}"><td></td><td colspan="2" style="padding-left: 1rem;">${title}</td></tr>`
    : ``;
};
export const renderTooltipSeperationLine = (seperationLineColor) => {
  return `</table><hr style="border-color: ${seperationLineColor};"/><table>`;
};
