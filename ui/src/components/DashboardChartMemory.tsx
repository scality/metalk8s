import { LineTimeSerieChart, useChartId, useMetricsTimeSpan } from '@scality/core-ui/dist/next';
import { useCallback } from 'react';
import { HEIGHT_DEFAULT_CHART } from '../constants';
import { useNodeAddressesSelector, useNodes, useShowQuantileChart, useSingleChartSerie } from '../hooks';
import { useChartLegendRegistration } from '../hooks/useChartLegendRegistration';
import { getMultiResourceSeriesForChart } from '../services/graphUtils';
import {
  getNodesMemoryOutpassingThresholdQuery,
  getNodesMemoryQuantileQuery,
  getNodesMemoryQuery,
} from '../services/platformlibrary/metrics';
import NonSymmetricalQuantileChart from './NonSymmetricalQuantileChart';

const DashboardChartMemory = () => {
  const { isShowQuantileChart } = useShowQuantileChart();
  return (
    <>
      {isShowQuantileChart ? (
        <NonSymmetricalQuantileChart
          getQuantileQuery={getNodesMemoryQuantileQuery}
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
  const nodes = useNodes();
  const nodeAddresses = useNodeAddressesSelector(nodes);

  const { interval, duration } = useMetricsTimeSpan();
  const { isLoading, series, startingTimeStamp } = useSingleChartSerie({
    getQuery: (timeSpanProps) => getNodesMemoryQuery(timeSpanProps),
    transformPrometheusDataToSeries: useCallback(
      (prometheusResult) => {
        const result = getMultiResourceSeriesForChart(prometheusResult, nodeAddresses);
        return result;
      },
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
      title="Memory"
      startingTimeStamp={startingTimeStamp}
      yAxisType={'percentage'}
      isLoading={isLoading}
      syncId="dashboard"
    />
  );
};

export default DashboardChartMemory;
