import React, { useCallback } from 'react';
import { LineTemporalChart } from '@scality/core-ui/dist/next';
import { GraphWrapper } from './DashboardMetrics';
import { getMultiResourceSeriesForChart } from '../services/graphUtils';
import {
  useNodeAddressesSelector,
  useNodes,
  useSingleChartSerie,
} from '../hooks';
import { getNodesCPUUsageQuery } from '../services/platformlibrary/metrics';

const DashboardChartCpuUsage = () => {
  const nodeAddresses = useNodeAddressesSelector(useNodes());
  const { isLoading, series, startingTimeStamp } = useSingleChartSerie({
    getQuery: (timeSpanProps) => getNodesCPUUsageQuery(timeSpanProps),
    transformPrometheusDataToSeries: useCallback(
      (prometheusResult) =>
        getMultiResourceSeriesForChart(prometheusResult, nodeAddresses),
      [JSON.stringify(nodeAddresses)],
    ),
  });

  return (
    <GraphWrapper>
      <LineTemporalChart
        series={series}
        height={80}
        title="CPU Usage"
        startingTimeStamp={startingTimeStamp}
        yAxisType={'percentage'}
        isLegendHided={false}
        isLoading={isLoading}
      />
    </GraphWrapper>
  );
};
export default DashboardChartCpuUsage;
