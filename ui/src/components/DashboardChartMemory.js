import React, { useCallback } from 'react';
import { LineTemporalChart } from '@scality/core-ui/dist/next';
import { GraphWrapper } from './DashboardMetrics';
import {
  useNodes,
  useNodeAddressesSelector,
  useSingleChartSerie,
} from '../hooks';
import { getNodesMemoryQuery } from '../services/platformlibrary/metrics';
import { getMultiResourceSeriesForChart } from '../services/graphUtils';

const DashboardChartMemory = () => {
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
    <GraphWrapper>
      <LineTemporalChart
        series={series}
        height={80}
        title="Memory"
        startingTimeStamp={startingTimeStamp}
        yAxisType={'percentage'}
        isLegendHided={true}
        isLoading={isLoading}
      />
    </GraphWrapper>
  );
};

export default DashboardChartMemory;
