import React, { useCallback } from 'react';
import { LineTemporalChart } from '@scality/core-ui/dist/next';
import { GraphWrapper } from './DashboardMetrics';
import {
  useNodeAddressesSelector,
  useNodes,
  useSingleChartSerie,
} from '../hooks';
import type { DashboardChartProps } from '../containers/DashboardPage';
import { getNodesSystemLoadQuery } from '../services/platformlibrary/metrics';
import { getMultiResourceSeriesForChart } from '../services/graphUtils';

const DashboardChartSystemLoad = (props: DashboardChartProps) => {
  const nodeAddresses = useNodeAddressesSelector(useNodes());
  const { isLoading, series, startingTimeStamp } = useSingleChartSerie({
    getQuery: (timeSpanProps) => getNodesSystemLoadQuery(timeSpanProps),
    transformPrometheusDataToSeries: useCallback(
      (prometheusResult) =>
        getMultiResourceSeriesForChart(prometheusResult, nodeAddresses),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [JSON.stringify(nodeAddresses)],
    ),
  });
  return (
    <GraphWrapper>
      <LineTemporalChart
        series={series}
        height={80}
        title="System Load"
        startingTimeStamp={startingTimeStamp}
        isLegendHided={true}
        isLoading={isLoading}
      />
    </GraphWrapper>
  );
};

export default DashboardChartSystemLoad;
