import React from 'react';
import { LineTemporalChart } from '@scality/core-ui/dist/next';
import { GraphWrapper } from './DashboardMetrics';
import {
  useNodeAddressesSelector,
  useNodes,
  useSymetricalChartSeries,
} from '../hooks';
import {
  getNodesThroughputReadQuery,
  getNodesThroughputWriteQuery,
} from '../services/platformlibrary/metrics';
import {
  UNIT_RANGE_BS,
  YAXIS_TITLE_READ_WRITE,
} from '@scality/core-ui/dist/components/linetemporalchart/LineTemporalChart.component';
import { getMultipleSymmetricalSeries } from '../services/graphUtils';

const DashboardChartThroughput = () => {
  const nodeAddresses = useNodeAddressesSelector(useNodes());
  const { isLoading, series, startingTimeStamp } = useSymetricalChartSeries({
    getQueryAbove: getNodesThroughputWriteQuery,
    getQueryBelow: getNodesThroughputReadQuery,
    transformPrometheusDataToSeries: (
      prometheusResultAbove,
      prometheusResultBelow,
    ) => {
      return getMultipleSymmetricalSeries(
        prometheusResultAbove,
        prometheusResultBelow,
        'write',
        'read',
        nodeAddresses,
      );
    },
  });

  return (
    <GraphWrapper>
      <LineTemporalChart
        series={series}
        title="Disk Throughput"
        height={150}
        yAxisType={'symmetrical'}
        unitRange={UNIT_RANGE_BS}
        startingTimeStamp={startingTimeStamp}
        isLegendHided={false}
        yAxisTitle={YAXIS_TITLE_READ_WRITE}
        isLoading={isLoading}
      />
    </GraphWrapper>
  );
};

export default DashboardChartThroughput;
