import {
  LineTimeSerieChart,
  useMetricsTimeSpan,
  useChartId,
} from '@scality/core-ui/dist/next';
import { useChartLegend } from '@scality/core-ui/dist/components/chartlegend/ChartLegendWrapper';

import { useCallback, useEffect } from 'react';
import {
  useNodeAddressesSelector,
  useNodes,
  useShowQuantileChart,
  useSingleChartSerie,
} from '../hooks';
import { getMultiResourceSeriesForChart } from '../services/graphUtils';
import {
  getNodesSystemLoadOutpassingThresholdQuery,
  getNodesSystemLoadQuantileQuery,
  getNodesSystemLoadQuery,
} from '../services/platformlibrary/metrics';
import NonSymmetricalQuantileChart from './NonSymmetricalQuantileChart';

const DashboardChartSystemLoad = () => {
  const { isShowQuantileChart } = useShowQuantileChart();
  return (
    <>
      {isShowQuantileChart ? (
        <NonSymmetricalQuantileChart
          getQuantileQuery={getNodesSystemLoadQuantileQuery}
          getQuantileHoverQuery={getNodesSystemLoadOutpassingThresholdQuery}
          title={'System Load'}
          yAxisType={'percentage'}
        />
      ) : (
        <DashboardChartSystemLoadWithoutQuantiles />
      )}
    </>
  );
};

const DashboardChartSystemLoadWithoutQuantiles = () => {
  const chartId = useChartId();
  const { register } = useChartLegend();
  const nodes = useNodes();
  const nodeAddresses = useNodeAddressesSelector(nodes);

  const { interval, duration } = useMetricsTimeSpan();
  const { isLoading, series, startingTimeStamp } = useSingleChartSerie({
    getQuery: (timeSpanProps) => getNodesSystemLoadQuery(timeSpanProps),
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
      title="System Load"
      startingTimeStamp={startingTimeStamp}
      isLoading={isLoading}
      syncId="dashboard"
    />
  );
};

export default DashboardChartSystemLoad;
