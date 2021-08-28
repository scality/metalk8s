import React, { useRef, useEffect } from 'react';
import { LineTemporalChart } from '@scality/core-ui/dist/next';
import { GraphWrapper } from './DashboardMetrics';
import { formatNodesPromRangeForChart } from '../services/graphUtils';
import { useQueries, UseQueryOptions } from 'react-query';
import { queryNodeCPUMetrics } from '../services/prometheus/fetchMetrics';
import { useNodeAddressesSelector, useNodes } from '../hooks';
import { useStartingTimeStamp } from '../containers/StartTimeProvider';
import { useMetricsTimeSpan } from '@scality/core-ui/dist/next';

const DashboardChartCpuUsage = (props: UseQueryOptions) => {
  const nodeAddresses = useNodeAddressesSelector(useNodes());
  const { startingTimeISO, currentTimeISO } = useStartingTimeStamp();
  const startTimeRef = useRef(startingTimeISO);
  const chartStartTimeRef = useRef(startingTimeISO); //IMPORTANT: the ref of the previous start time
  const { sampleFrequency } = useMetricsTimeSpan();
  const seriesRef = useRef();
  // Passing nodes table as a react-queries identifier so if a node is added/removed the data are refreshed
  // Also it makes the data to auto-refresh based on the node refresh timeout that is already implemented
  const cpuDataQuery = useQueries(
    nodeAddresses.map((node) => {
      return {
        queryKey: ['nodeMetricsCPU', node.name, startingTimeISO],
        queryFn: () => {
          startTimeRef.current = startingTimeISO;
          return queryNodeCPUMetrics(
            node.internalIP,
            sampleFrequency,
            startingTimeISO,
            currentTimeISO,
          );
        },
        ...props.reactQueryOptions,
      };
    }),
  );

  const isNodeLoading = cpuDataQuery.some((query) => query.isLoading);

  useEffect(() => {
    if (!isNodeLoading) {
      chartStartTimeRef.current = startTimeRef.current;
      seriesRef.current = formatNodesPromRangeForChart(
        cpuDataQuery.map((query) => query.data),
        nodeAddresses,
      );
    }
  }, [isNodeLoading, nodeAddresses]);

  return (
    <GraphWrapper>
      <LineTemporalChart
        series={seriesRef.current || []}
        height={80}
        title="CPU Usage"
        startingTimeStamp={Date.parse(chartStartTimeRef.current) / 1000}
        yAxisType={'percentage'}
        isLegendHided={true}
        isLoading={isNodeLoading}
      />
    </GraphWrapper>
  );
};
export default DashboardChartCpuUsage;
