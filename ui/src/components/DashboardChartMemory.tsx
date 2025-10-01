import {
  LineTimeSerieChart,
  useMetricsTimeSpan,
  useChartId,
} from '@scality/core-ui/dist/next';
import { useChartLegend } from '@scality/core-ui/dist/components/chartlegend/ChartLegendWrapper';

import { useCallback, useEffect } from 'react';
import {
  useNodes,
  useNodeAddressesSelector,
  useSingleChartSerie,
  useShowQuantileChart,
} from '../hooks';
import {
  getNodesMemoryOutpassingThresholdQuery,
  getNodesMemoryQuantileQuery,
  getNodesMemoryQuery,
} from '../services/platformlibrary/metrics';
import { getMultiResourceSeriesForChart } from '../services/graphUtils';
import NonSymmetricalQuantileChart from './NonSymmetricalQuantileChart';

const DashboardChartMemory = () => {
  const { isShowQuantileChart } = useShowQuantileChart();
  return (
    <>
      {isShowQuantileChart ? (
        <NonSymmetricalQuantileChart
          // @ts-expect-error - FIXME when you are working on it
          getQuantileQuery={getNodesMemoryQuantileQuery}
          // @ts-expect-error - FIXME when you are working on it
          getQuantileHoverQuery={getNodesMemoryOutpassingThresholdQuery}
          title={'Memory'}
          yAxisType={'percentage'}
        />
      ) : (
        <DashboardChartMemoryWithoutQuantiles />
      )}
    </>
  );
};

const DashboardChartMemoryWithoutQuantiles = () => {
  const chartId = useChartId();
  const { register } = useChartLegend();
  const nodes = useNodes();
  const nodeAddresses = useNodeAddressesSelector(nodes);

  const { interval, duration } = useMetricsTimeSpan();
  const { isLoading, series, startingTimeStamp } = useSingleChartSerie({
    // @ts-expect-error - FIXME when you are working on it
    getQuery: (timeSpanProps) => getNodesMemoryQuery(timeSpanProps),
    transformPrometheusDataToSeries: useCallback(
      (prometheusResult) => {
        const result = getMultiResourceSeriesForChart(
          prometheusResult,
          nodeAddresses,
        );
        return result;
      },
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
      title="Memory"
      startingTimeStamp={startingTimeStamp}
      yAxisType={'percentage'}
      isLoading={isLoading}
      syncId="dashboard"
    />
  );
};

export default DashboardChartMemory;
