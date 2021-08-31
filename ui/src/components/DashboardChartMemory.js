import React, { useRef } from 'react';
import {
  LineTemporalChart,
  useMetricsTimeSpan,
} from '@scality/core-ui/dist/next';
import { useQueries, UseQueryOptions } from 'react-query';
import { GraphWrapper } from './DashboardMetrics';
import { queryNodeMemoryMetrics } from '../services/prometheus/fetchMetrics';
import { useNodes, useNodeAddressesSelector } from '../hooks';
import { formatNodesPromRangeForChart } from '../services/graphUtils';
import { useStartingTimeStamp } from '../containers/StartTimeProvider';
import { useEffect } from 'react';

const DashboardChartMemory = (props: UseQueryOptions) => {
  const nodeAddresses = useNodeAddressesSelector(useNodes());
  const { startingTimeISO, currentTimeISO } = useStartingTimeStamp();
  const startTimeRef = useRef(startingTimeISO);
  const chartStartTimeRef = useRef(startingTimeISO);
  const seriesRef = useRef();
  const { sampleFrequency } = useMetricsTimeSpan();

  // Passing nodes table as a react-queries identifier so if a node is added/removed the data are refreshed
  // Also it makes the data to auto-refresh based on the node refresh timeout that is already implemented
  const memoryDataQuery = useQueries(
    nodeAddresses.map((node) => {
      return {
        queryKey: ['nodeMetricsMemory', node.name, startingTimeISO],
        queryFn: () => {
          startTimeRef.current = startingTimeISO;
          return queryNodeMemoryMetrics(
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
  const isDataLoading = memoryDataQuery.some((query) => query.isLoading);

  useEffect(() => {
    if (!isDataLoading) {
      seriesRef.current = formatNodesPromRangeForChart(
        memoryDataQuery.map((query) => query.data),
        nodeAddresses,
      );
      chartStartTimeRef.current = startTimeRef.current;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDataLoading, nodeAddresses]);

  return (
    <GraphWrapper>
      <LineTemporalChart
        series={seriesRef.current || []}
        height={80}
        title="Memory"
        startingTimeStamp={Date.parse(chartStartTimeRef.current) / 1000}
        yAxisType={'percentage'}
        isLegendHided={true}
        isLoading={isDataLoading}
      />
    </GraphWrapper>
  );
};

export default DashboardChartMemory;
