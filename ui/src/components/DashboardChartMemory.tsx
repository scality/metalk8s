import React, { useCallback } from 'react';
import { LineTemporalChart } from '@scality/core-ui/dist/next';
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
  const nodeAddresses = useNodeAddressesSelector(useNodes());
  const { isLoading, series, startingTimeStamp } = useSingleChartSerie({
    getQuery: (timeSpanProps) => getNodesMemoryQuery(timeSpanProps),
    transformPrometheusDataToSeries: useCallback(
      (prometheusResult) => {
        const result = getMultiResourceSeriesForChart(
          prometheusResult,
          nodeAddresses,
        );
        return result;
      }, // eslint-disable-next-line react-hooks/exhaustive-deps
      [JSON.stringify(nodeAddresses)],
    ),
  });
  return (
    <LineTemporalChart
      series={series}
      height={80}
      title="Memory"
      startingTimeStamp={startingTimeStamp}
      yAxisType={'percentage'}
      isLegendHidden={true}
      isLoading={isLoading}
    />
  );
};

export default DashboardChartMemory;