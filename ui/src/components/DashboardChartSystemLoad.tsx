import {
  LineTimeSerieChart,
  useMetricsTimeSpan,
  useChartId,
} from '@scality/core-ui/dist/next';
import { useChartLegendRegistration } from '../hooks/useChartLegendRegistration';

import { useCallback } from 'react';
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
import { HEIGHT_DEFAULT_CHART } from '../constants';

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

  useChartLegendRegistration({ chartId, series, isSymmetrical: false });

  return (
    <LineTimeSerieChart
      series={series}
      height={HEIGHT_DEFAULT_CHART}
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
