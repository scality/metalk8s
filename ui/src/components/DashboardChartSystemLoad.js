import React, { useCallback } from 'react';
import { LineTemporalChart } from '@scality/core-ui/dist/next';
import {
  useNodeAddressesSelector,
  useNodes,
  useShowQuantileChart,
  useSingleChartSerie,
} from '../hooks';
import type { DashboardChartProps } from '../containers/DashboardPage';
import {
  getNodesSystemLoadOutpassingThresholdQuery,
  getNodesSystemLoadQuantileQuery,
  getNodesSystemLoadQuery,
} from '../services/platformlibrary/metrics';
import { getMultiResourceSeriesForChart } from '../services/graphUtils';
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
        />
      ) : (
        <DashboardChartSystemLoadWithoutQuantiles />
      )}
    </>
  );
};

const DashboardChartSystemLoadWithoutQuantiles = (
  props: DashboardChartProps,
) => {
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
