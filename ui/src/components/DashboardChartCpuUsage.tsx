import React, { useCallback } from 'react';
import { LineTemporalChart } from '@scality/core-ui/dist/next';
import { getMultiResourceSeriesForChart } from '../services/graphUtils';
import {
  useNodeAddressesSelector,
  useNodes,
  useShowQuantileChart,
  useSingleChartSerie,
} from '../hooks';
import {
  getNodesCPUUsageOutpassingThresholdQuery,
  getNodesCPUUsageQuantileQuery,
  getNodesCPUUsageQuery,
} from '../services/platformlibrary/metrics';
import NonSymmetricalQuantileChart from './NonSymmetricalQuantileChart';

const DashboardChartCpuUsage = () => {
  const { isShowQuantileChart } = useShowQuantileChart();
  return (
    <>
      {isShowQuantileChart ? (
        <NonSymmetricalQuantileChart
          // @ts-expect-error - FIXME when you are working on it
          getQuantileQuery={getNodesCPUUsageQuantileQuery}
          // @ts-expect-error - FIXME when you are working on it
          getQuantileHoverQuery={getNodesCPUUsageOutpassingThresholdQuery}
          title={'CPU Usage'}
          yAxisType={'percentage'}
        />
      ) : (
        <DashboardChartCpuUsageWithoutQuantils />
      )}
    </>
  );
};

const DashboardChartCpuUsageWithoutQuantils = () => {
  const nodeAddresses = useNodeAddressesSelector(useNodes());
  const { isLoading, series, startingTimeStamp } = useSingleChartSerie({
    // @ts-expect-error - FIXME when you are working on it
    getQuery: (timeSpanProps) => getNodesCPUUsageQuery(timeSpanProps),
    transformPrometheusDataToSeries: useCallback(
      (prometheusResult) =>
        getMultiResourceSeriesForChart(prometheusResult, nodeAddresses), // eslint-disable-next-line react-hooks/exhaustive-deps
      [JSON.stringify(nodeAddresses)],
    ),
  });
  return (
    <LineTemporalChart
      series={series}
      height={80}
      title="CPU Usage"
      startingTimeStamp={startingTimeStamp}
      yAxisType={'percentage'}
      isLegendHidden={true}
      isLoading={isLoading}
    />
  );
};

export default DashboardChartCpuUsage;
