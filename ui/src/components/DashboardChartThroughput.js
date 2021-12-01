import React, { useCallback } from 'react';
import { LineTemporalChart } from '@scality/core-ui/dist/next';
import {
  UNIT_RANGE_BS,
  YAXIS_TITLE_READ_WRITE,
} from '@scality/core-ui/dist/components/linetemporalchart/LineTemporalChart.component';
import { GraphWrapper } from './DashboardMetrics';
import {
  useNodeAddressesSelector,
  useNodes,
  useSymetricalChartSeries,
} from '../hooks';
import {
  getNodesThroughputReadAboveBelowThresholdQuery,
  getNodesThroughputReadQuantileQuery,
  getNodesThroughputReadQuery,
  getNodesThroughputWriteAboveBelowThresholdQuery,
  getNodesThroughputWriteQuantileQuery,
  getNodesThroughputWriteQuery,
} from '../services/platformlibrary/metrics';
import { getMultipleSymmetricalSeries } from '../services/graphUtils';
import SymmetricalQuantileChart from './SymmetricalQuantileChart';
import { useTheme } from 'styled-components';
import { defaultRenderTooltipSerie } from '@scality/core-ui/dist/components/linetemporalchart/tooltip';

const DashboardChartThroughput = ({
  isShowQuantileChart,
}: {
  isShowQuantileChart: boolean,
}) => {
  return (
    <GraphWrapper>
      {isShowQuantileChart ? (
        <SymmetricalQuantileChart
          getAboveQuantileQuery={getNodesThroughputWriteQuantileQuery}
          getBelowQuantileQuery={getNodesThroughputReadQuantileQuery}
          getAboveQuantileHoverQuery={
            getNodesThroughputWriteAboveBelowThresholdQuery
          }
          getBelowQuantileHoverQuery={
            getNodesThroughputReadAboveBelowThresholdQuery
          }
          metricPrefixAbove={'write'}
          metricPrefixBelow={'read'}
          title={'Disk Throughput'}
          yAxisTitle={YAXIS_TITLE_READ_WRITE}
        />
      ) : (
        <DashboardChartThroughputWithoutQuantile />
      )}
    </GraphWrapper>
  );
};

const DashboardChartThroughputWithoutQuantile = () => {
  const theme = useTheme();
  const nodes = useNodes();
  const nodeAddresses = useNodeAddressesSelector(nodes);
  const lastNodeName = nodes?.slice(-1)[0]?.metadata?.name;

  const { isLoading, series, startingTimeStamp } = useSymetricalChartSeries({
    getAboveQueries: (timeSpanProps) => [
      getNodesThroughputWriteQuery(timeSpanProps),
    ],
    getBelowQueries: (timeSpanProps) => [
      getNodesThroughputReadQuery(timeSpanProps),
    ],
    transformPrometheusDataToSeries: useCallback(
      (prometheusResultAbove, prometheusResultBelow) => {
        return getMultipleSymmetricalSeries(
          prometheusResultAbove[0],
          prometheusResultBelow[0],
          'write',
          'read',
          nodeAddresses,
        );
      },
      [JSON.stringify(nodeAddresses)],
    ),
  });

  return (
    <LineTemporalChart
      series={series}
      title="Disk Throughput"
      height={150}
      yAxisType={'symmetrical'}
      unitRange={UNIT_RANGE_BS}
      startingTimeStamp={startingTimeStamp}
      isLegendHided={false}
      yAxisTitle={YAXIS_TITLE_READ_WRITE}
      isLoading={isLoading}
      renderTooltipSerie={useCallback(
        (serie) => {
          if (serie.key === `${lastNodeName}-write`) {
            return `${defaultRenderTooltipSerie(serie)}</table>
            <hr style="border-color: ${theme.border};"/><table>`;
          } else {
            return defaultRenderTooltipSerie(serie);
          }
        },
        [lastNodeName, theme],
      )}
    />
  );
};

export default DashboardChartThroughput;
