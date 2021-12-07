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
  renderOutpassingThresholdTitle,
  renderQuantileData,
  renderTooltipSerie,
} from '../services/graphUtils';
import { useIntl } from 'react-intl';

const NonSymmetricalQuantileChart = ({
  getQuantileQuery,
  getQuantileHoverQuery,
  title,
  yAxisType,
  isLegendHidden,
  helpText,
}: {
  getQuantileQuery: UseQueryOptions,
  getQuantileHoverQuery: UseQueryOptions,
  title: string,
  yAxisType: string,
  isLegendHidden: boolean,
}) => {
  const theme = useTheme();
  const intl = useIntl();
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
      getQuantileQuery(timeSpanProps, 0.9),
      getQuantileQuery(timeSpanProps, 0.5),
      getQuantileQuery(timeSpanProps, 0.05),
    ],
    transformPrometheusDataToSeries: useCallback(
      ([
        prometheusResultQuantile90,
        prometheusResultMedian,
        prometheusResultQuantile5,
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
      isError: isErrorQuanile5,
      data: quantile5Data,
    },
    quantile90Result: {
      isIdle: isIdleQuantile90,
      isLoading: isLoadingQuantile90,
      isSuccess: isSuccessQuantile90,
      isError: isErrorQuanile90,
      data: quantile90Data,
    },
    isOnHoverFetchingNeeded,
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
      isLegendHidden={isLegendHidden}
      isLoading={isLoadingQuantile}
      onHover={onHover}
      renderTooltipSerie={useCallback(
        (serie, tooltipData) => {
          if (serie.key === 'Q90') {
            return (
              renderTooltipSerie(serie) +
              renderOutpassingThresholdTitle(
                `Nodes above ${serie.key}`,
                isOnHoverFetchingNeeded,
                theme,
              ) +
              (isOnHoverFetchingNeeded
                ? `${renderQuantileData(
                    isIdleQuantile90,
                    isLoadingQuantile90,
                    isSuccessQuantile90,
                    isErrorQuanile90,
                    quantile90Data,
                    nodeMapPerIp,
                    theme,
                    1,
                    serie.unitLabel,
                  )}
              `
                : '')
            );
          }

          if (serie.key === 'Q5') {
            return (
              renderTooltipSerie(serie) +
              renderOutpassingThresholdTitle(
                `Nodes below ${serie.key}`,
                isOnHoverFetchingNeeded,
                theme,
              ) +
              (isOnHoverFetchingNeeded
                ? `${renderQuantileData(
                    isIdleQuantile5,
                    isLoadingQuantile5,
                    isSuccessQuantile5,
                    isErrorQuanile5,
                    quantile5Data,
                    nodeMapPerIp,
                    theme,
                    1,
                    serie.unitLabel,
                    intl,
                  )}
                `
                : '')
            );
          }
          return renderTooltipSerie(serie);
        },
        [
          isIdleQuantile90,
          isLoadingQuantile90,
          isSuccessQuantile90,
          isErrorQuanile90,
          isIdleQuantile5,
          isLoadingQuantile5,
          isSuccessQuantile5,
          isErrorQuanile5,
          JSON.stringify(quantile5Data?.data),
          JSON.stringify(quantile90Data?.data),
          JSON.stringify(nodeMapPerIp),
          isOnHoverFetchingNeeded,
        ],
      )}
    />
  );
};
export default NonSymmetricalQuantileChart;
