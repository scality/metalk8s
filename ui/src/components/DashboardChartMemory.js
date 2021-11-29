import React, { useCallback } from 'react';
import { LineTemporalChart } from '@scality/core-ui/dist/next';
import { GraphWrapper } from './DashboardMetrics';
import {
  useNodes,
  useNodeAddressesSelector,
  useSingleChartSerie,
} from '../hooks';
import {
  getNodesMemoryAboveBelowThresholdQuery,
  getNodesMemoryQuantileQuery,
  getNodesMemoryQuery,
} from '../services/platformlibrary/metrics';
import { getMultiResourceSeriesForChart } from '../services/graphUtils';
import NonSymmetricalQuantileChart from './NonSymmetricalQuantileChart';

const DashboardChartMemory = ({
  isShowQuantileChart,
}: {
  isShowQuantileChart: boolean,
}) => {
  return (
    <GraphWrapper>
      {isShowQuantileChart ? (
        <NonSymmetricalQuantileChart
          getQuantileQuery={getNodesMemoryQuantileQuery}
          getQuantileHoverQuery={getNodesMemoryAboveBelowThresholdQuery}
          title={'Memory'}
          yAxisType={'percentage'}
          isLegendHided={true}
        />
      ) : (
        <DashboardChartMemoryWithoutQuantiles />
      )}
    </GraphWrapper>
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
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
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
      isLegendHided={true}
      isLoading={isLoading}
    />
  );
};

export default DashboardChartMemory;
