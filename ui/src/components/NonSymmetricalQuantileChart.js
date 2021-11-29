import React, { useCallback } from 'react';
import { LineTemporalChart } from '@scality/core-ui/dist/next';
import { useTheme } from 'styled-components';
import { PORT_NODE_EXPORTER } from '../constants';
import {
  useChartSeries,
  useNodeAddressesSelector,
  useNodes,
  useQuantileOnHover,
} from '../hooks';
import {
  convertPrometheusResultToSerie,
  renderQuantileData,
  renderTooltipSerie,
} from '../services/graphUtils';

const NonSymmetricalQuantileChart = ({
  getQuantileQuery,
  getQuantileHoverQuery,
  title,
  yAxisType,
  isLegendHided,
  helpText,
}: {
  getQuantileQuery: UseQueryOptions,
  getQuantileHoverQuery: UseQueryOptions,
  title: string,
  yAxisType: string,
  isLegendHided: boolean,
}) => {
  const theme = useTheme();
  const nodeAddresses = useNodeAddressesSelector(useNodes());
  const nodeMapPerIp = nodeAddresses.reduce(
    (agg, current) => ({
      ...agg,
      [current.internalIP + `:${PORT_NODE_EXPORTER}`]: current.name,
    }),
    {},
  );

  const {
    isLoading: isLoadingQuantile,
    series: seriesQuantile,
    startingTimeStamp: startingTimeStampQuantile,
  } = useChartSeries({
    getQueries: (timeSpanProps) => [
      getQuantileQuery(timeSpanProps, 0.05),
      getQuantileQuery(timeSpanProps, 0.5),
      getQuantileQuery(timeSpanProps, 0.9),
    ],
    transformPrometheusDataToSeries: useCallback(
      ([
        prometheusResultQuantile5,
        prometheusResultMedian,
        prometheusResultQuantile90,
      ]) => {
        return [
          convertPrometheusResultToSerie(prometheusResultQuantile90, 'Q90'),
          convertPrometheusResultToSerie(prometheusResultMedian, 'Median'),
          convertPrometheusResultToSerie(prometheusResultQuantile5, 'Q5'),
        ];
      },
      [],
    ),
  });

  const {
    onHover,
    quantile5Result: {
      isIdle: isIdleQuantile5,
      isLoading: isLoadingQuantile5,
      isSuccess: isSuccessQuantile5,
      data: quantile5Data,
    },
    quantile90Result: {
      isIdle: isIdleQuantile90,
      isLoading: isLoadingQuantile90,
      isSuccess: isSuccessQuantile90,
      data: quantile90Data,
    },
  } = useQuantileOnHover({
    getQuantileHoverQuery,
  });
  return (
    <LineTemporalChart
      series={seriesQuantile}
      height={80}
      title={title}
      helpText={helpText}
      startingTimeStamp={startingTimeStampQuantile}
      yAxisType={yAxisType}
      isLegendHided={isLegendHided}
      isLoading={isLoadingQuantile}
      onHover={onHover}
      renderTooltipSerie={useCallback(
        (serie, tooltipData) => {
          if (serie.key === 'Q90') {
            return (
              renderTooltipSerie(serie) +
              `<tr style="color: ${
                theme.textSecondary
              }"><td></td><td colspan="2" style="padding-left: 1rem;">Nodes above Q90</td></tr>
                ${renderQuantileData(
                  isIdleQuantile90,
                  isLoadingQuantile90,
                  isSuccessQuantile90,
                  quantile90Data,
                  nodeMapPerIp,
                  theme,
                  1,
                  serie.unitLabel,
                )}
                `
            );
          }

          if (serie.key === 'Q5') {
            return (
              renderTooltipSerie(serie) +
              `<tr style="color: ${
                theme.textSecondary
              }"><td></td><td colspan="2" style="padding-left: 1rem;">Nodes below Q5</td></tr>
                ${renderQuantileData(
                  isIdleQuantile5,
                  isLoadingQuantile5,
                  isSuccessQuantile5,
                  quantile5Data,
                  nodeMapPerIp,
                  theme,
                  1,
                  serie.unitLabel,
                )}
                `
            );
          }
          return renderTooltipSerie(serie);
        },
        [
          isIdleQuantile90,
          isLoadingQuantile90,
          isSuccessQuantile90,
          isIdleQuantile5,
          isLoadingQuantile5,
          isSuccessQuantile5,
          JSON.stringify(quantile5Data?.data),
          JSON.stringify(quantile90Data?.data),
          JSON.stringify(nodeMapPerIp),
        ],
      )}
    />
  );
};
export default NonSymmetricalQuantileChart;
