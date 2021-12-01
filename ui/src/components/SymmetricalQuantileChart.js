import React, { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { UNIT_RANGE_BS } from '@scality/core-ui/dist/components/linetemporalchart/LineTemporalChart.component';
import { LineTemporalChart } from '@scality/core-ui/dist/next';
import { useTheme } from 'styled-components';
import { PORT_NODE_EXPORTER } from '../constants';
import {
  useNodeAddressesSelector,
  useNodes,
  useQuantileOnHover,
  useSymetricalChartSeries,
} from '../hooks';
import {
  getNodesInterfacesString,
  getQuantileSymmetricalSeries,
  renderQuantileData,
  renderTooltipSerie,
} from '../services/graphUtils';

const SymmetricalQuantileChart = ({
  getAboveQuantileQuery,
  getBelowQuantileQuery,
  getAboveQuantileHoverQuery,
  getBelowQuantileHoverQuery,
  metricPrefixAbove,
  metricPrefixBelow,
  title,
  yAxisTitle,
  isLegendHidden,
}: {
  getAboveQuantileQuery: UseQueryOptions,
  getBelowQuantileQuery: UseQueryOptions,
  getAboveQuantileHoverQuery: UseQueryOptions,
  getBelowQuantileHoverQuery: UseQueryOptions,
  metricPrefixAbove: string,
  metricPrefixBelow: string,
  title: string,
  yAxisTitle: string,
  isLegendHidden?: Boolean,
}) => {
  const theme = useTheme();
  const nodeAddresses = useNodeAddressesSelector(useNodes());
  const nodeIPsInfo = useSelector((state) => state.app.nodes.IPsInfo);
  const devices = getNodesInterfacesString(nodeIPsInfo);
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
  } = useSymetricalChartSeries({
    getAboveQueries: (timeSpanProps) => [
      getAboveQuantileQuery(timeSpanProps, 0.05, devices),
      getAboveQuantileQuery(timeSpanProps, 0.5, devices),
      getAboveQuantileQuery(timeSpanProps, 0.9, devices),
    ],

    getBelowQueries: (timeSpanProps) => [
      getBelowQuantileQuery(timeSpanProps, 0.05, devices),
      getBelowQuantileQuery(timeSpanProps, 0.5, devices),
      getBelowQuantileQuery(timeSpanProps, 0.9, devices),
    ],
    transformPrometheusDataToSeries: useCallback(
      (prometheusResultAbove, prometheusResultBelow) => {
        if (!prometheusResultAbove || !prometheusResultBelow) {
          return [];
        }
        if (prometheusResultAbove && prometheusResultBelow) {
          return getQuantileSymmetricalSeries(
            prometheusResultAbove,
            prometheusResultBelow,
            metricPrefixAbove,
            metricPrefixBelow,
          );
        }
        return [];
      },
      [metricPrefixAbove, metricPrefixBelow],
    ),
  });

  const {
    quantile5Result: {
      isIdle: isIdleQuantile5,
      isLoading: isLoadingQuantile5,
      isSuccess: isSuccessQuantile5,
      data: quantile5Data,
    },
    quantile90Result: {
      isIdle: isIdleQuantile90In,
      isLoading: isLoadingQuantile90In,
      isSuccess: isSuccessQuantile90In,
      data: quantile90InData,
    },
    valueBase,
    onHover: onHoverIn,
  } = useQuantileOnHover({
    getQuantileHoverQuery: getAboveQuantileHoverQuery,
    metricPrefix: metricPrefixAbove,
  });
  const {
    quantile5Result: {
      isIdle: isIdleQuantile5Out,
      isLoading: isLoadingQuantile5Out,
      isSuccess: isSuccessQuantile5Out,
      data: quantile5OutData,
    },
    quantile90Result: {
      isIdle: isIdleQuantile90Out,
      isLoading: isLoadingQuantile90Out,
      isSuccess: isSuccessQuantile90Out,
      data: quantile90OutData,
    },
    onHover: onHoverOut,
  } = useQuantileOnHover({
    getQuantileHoverQuery: getBelowQuantileHoverQuery,
    metricPrefix: metricPrefixBelow,
  });

  const renderTooltip = useCallback(
    (serie, isIdle, isLoading, isSuccess, data, aboveOrBelow) => {
      return (
        renderTooltipSerie(serie) +
        `<tr style="color: ${
          theme.textSecondary
        }"><td></td><td colspan="2" style="padding-left: 1rem;">Nodes ${aboveOrBelow} ${
          serie.key
        }</td></tr>
  ${renderQuantileData(
    isIdle,
    isLoading,
    isSuccess,
    data,
    nodeMapPerIp,
    theme,
    valueBase,
    serie.unitLabel,
  )}`
      );
    },
    [nodeMapPerIp, theme, valueBase],
  );

  return (
    <LineTemporalChart
      series={seriesQuantile}
      height={150}
      title={title}
      startingTimeStamp={startingTimeStampQuantile}
      isLoading={isLoadingQuantile}
      yAxisType={'symmetrical'}
      onHover={useCallback(
        (datum) => {
          onHoverIn(datum);
          onHoverOut(datum);
        },
        [onHoverIn, onHoverOut],
      )}
      yAxisTitle={yAxisTitle}
      isLegendHidden={isLegendHidden}
      unitRange={UNIT_RANGE_BS}
      renderTooltipSerie={useCallback(
        (serie) => {
          if (serie.key === `Q90-${metricPrefixAbove}`) {
            return renderTooltip(
              serie,
              isIdleQuantile90In,
              isLoadingQuantile90In,
              isSuccessQuantile90In,
              quantile90InData,
              'above',
            );
          }
          if (serie.key === `Q5-${metricPrefixAbove}`) {
            // add a seperation line between metricAbove and metricBelow
            return `${renderTooltip(
              serie,
              isIdleQuantile5,
              isLoadingQuantile5,
              isSuccessQuantile5,
              quantile5Data,
              'above',
            )}</table>
            <hr style="border-color: ${theme.border};"/><table>
            `;
          }
          if (serie.key === `Q90-${metricPrefixBelow}`) {
            return renderTooltip(
              serie,
              isIdleQuantile90Out,
              isLoadingQuantile90Out,
              isSuccessQuantile90Out,
              quantile90OutData,
              'below',
            );
          }

          if (serie.key === `Q5-${metricPrefixBelow}`) {
            return renderTooltip(
              serie,
              isIdleQuantile5Out,
              isLoadingQuantile5Out,
              isSuccessQuantile5Out,
              quantile5OutData,
              'below',
            );
          }
          return renderTooltipSerie(serie);
        },
        [
          isIdleQuantile90In,
          isLoadingQuantile90In,
          isSuccessQuantile90In,
          isIdleQuantile5,
          isLoadingQuantile5,
          isSuccessQuantile5,
          isIdleQuantile90Out,
          isLoadingQuantile90Out,
          isSuccessQuantile90Out,
          isIdleQuantile5Out,
          isLoadingQuantile5Out,
          isSuccessQuantile5Out,
          JSON.stringify(quantile5Data?.data),
          JSON.stringify(quantile90InData?.data),
          JSON.stringify(quantile90OutData?.data),
          JSON.stringify(quantile5OutData?.data),
          JSON.stringify(nodeMapPerIp),
          metricPrefixAbove,
          metricPrefixBelow,
        ],
      )}
    />
  );
};

export default SymmetricalQuantileChart;
