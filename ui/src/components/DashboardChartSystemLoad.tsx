import { LineTemporalChart } from '@scality/core-ui/dist/next';
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

const DashboardChartSystemLoad = () => {
  const { isShowQuantileChart } = useShowQuantileChart();
  return (
    <>
      {isShowQuantileChart ? (
        <NonSymmetricalQuantileChart
          // @ts-expect-error - FIXME when you are working on it
          getQuantileQuery={getNodesSystemLoadQuantileQuery}
          // @ts-expect-error - FIXME when you are working on it
          getQuantileHoverQuery={getNodesSystemLoadOutpassingThresholdQuery}
          title={'System Load'}
        />
      ) : (
        <DashboardChartSystemLoadWithoutQuantiles />
      )}
    </>
  );
};

const DashboardChartSystemLoadWithoutQuantiles = () => {
  const nodeAddresses = useNodeAddressesSelector(useNodes());
  const { isLoading, series, startingTimeStamp } = useSingleChartSerie({
    getQuery: (timeSpanProps) =>
      // @ts-expect-error - FIXME when you are working on it
      getNodesSystemLoadQuery(timeSpanProps),
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
      title="System Load"
      startingTimeStamp={startingTimeStamp}
      isLegendHidden={true}
      isLoading={isLoading}
    />
  );
};

export default DashboardChartSystemLoad;
