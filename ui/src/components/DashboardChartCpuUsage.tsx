import {
  LineTimeSerieChart,
  useMetricsTimeSpan,
  useChartId,
} from '@scality/core-ui/dist/next';
import { useChartLegend } from '@scality/core-ui/dist/components/chartlegend/ChartLegendWrapper';

import { useCallback, useEffect } from 'react';
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
          getQuantileQuery={getNodesCPUUsageQuantileQuery}
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
  const chartId = useChartId();
  const { register } = useChartLegend();
  const nodes = useNodes();
  const nodeAddresses = useNodeAddressesSelector(nodes);

  const { interval, duration } = useMetricsTimeSpan();
  const { isLoading, series, startingTimeStamp } = useSingleChartSerie({
    // @ts-expect-error - FIXME when you are working on it
    getQuery: (timeSpanProps) => getNodesCPUUsageQuery(timeSpanProps),
    transformPrometheusDataToSeries: useCallback(
      (prometheusResult) =>
        getMultiResourceSeriesForChart(prometheusResult, nodeAddresses),
      //Expect warning because of complex dependency
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [JSON.stringify(nodeAddresses)],
    ),
  });

  // Register series names with ChartLegendWrapper
  useEffect(() => {
    if (series && series.length > 0) {
      const seriesNames = series.map((s) => s.resource);
      register(chartId, seriesNames);
    }
  }, [chartId, register, series]);

  return (
    <LineTimeSerieChart
      series={series}
      height={110}
      interval={interval}
      duration={duration}
      title="CPU Usage"
      startingTimeStamp={startingTimeStamp}
      yAxisType={'percentage'}
      isLoading={isLoading}
      syncId="dashboard"
    />
  );
};

export default DashboardChartCpuUsage;
