import {
  LineTimeSerieChart,
  useMetricsTimeSpan,
  useChartId,
} from '@scality/core-ui/dist/next';
import { useChartLegendRegistration } from '../hooks/useChartLegendRegistration';

import { useCallback } from 'react';
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
import { HEIGHT_DEFAULT_CHART } from '../constants';

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
  const nodes = useNodes();
  const nodeAddresses = useNodeAddressesSelector(nodes);

  const { interval, duration } = useMetricsTimeSpan();
  const { isLoading, series, startingTimeStamp } = useSingleChartSerie({
    getQuery: (timeSpanProps) => getNodesCPUUsageQuery(timeSpanProps),
    transformPrometheusDataToSeries: useCallback(
      (prometheusResult) =>
        getMultiResourceSeriesForChart(prometheusResult, nodeAddresses),
      //Expect warning because of complex dependency
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [JSON.stringify(nodeAddresses)],
    ),
  });

  useChartLegendRegistration({ chartId, series, isSymmetrical: false });

  return (
    <LineTimeSerieChart
      series={series}
      height={HEIGHT_DEFAULT_CHART}
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
