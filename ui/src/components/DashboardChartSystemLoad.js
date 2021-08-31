import React, { useRef } from 'react';
import {
  LineTemporalChart,
  useMetricsTimeSpan,
} from '@scality/core-ui/dist/next';
import { useQueries, UseQueryOptions } from 'react-query';
import { queryNodeLoadMetrics } from '../services/prometheus/fetchMetrics';
import { GraphWrapper } from './DashboardMetrics';
import { formatNodesPromRangeForChart } from '../services/graphUtils';
import { useNodeAddressesSelector, useNodes } from '../hooks';
import { useStartingTimeStamp } from '../containers/StartTimeProvider';
import { useEffect } from 'react';

const DashboardChartSystemLoad = (props: UseQueryOptions) => {
  const nodeAddresses = useNodeAddressesSelector(useNodes());
  const { startingTimeISO, currentTimeISO } = useStartingTimeStamp();
  const { sampleFrequency } = useMetricsTimeSpan();

  const startTimeRef = useRef(startingTimeISO);
  const chartStartTimeRef = useRef(startingTimeISO); //IMPORTANT: the ref of the previous start time
  const seriesRef = useRef();
  // Passing nodes table as a react-queries identifier so if a node is added/removed the data are refreshed
  // Also it makes the data to auto-refresh based on the node refresh timeout that is already implemented
  const systemLoadQuery = useQueries(
    nodeAddresses.map((node) => {
      return {
        queryKey: ['nodeMetricsLoad', node.name, startingTimeISO],
        queryFn: () => {
          startTimeRef.current = startingTimeISO;
          return queryNodeLoadMetrics(
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

  const isDataLoading = systemLoadQuery.some((query) => query.isLoading);

  useEffect(() => {
    if (!isDataLoading) {
      chartStartTimeRef.current = startTimeRef.current;
      seriesRef.current = formatNodesPromRangeForChart(
        systemLoadQuery.map((query) => query.data),
        nodeAddresses,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDataLoading, nodeAddresses]);

  return (
    <GraphWrapper>
      <LineTemporalChart
        series={seriesRef.current || []}
        title="System Load"
        height={80}
        startingTimeStamp={Date.parse(chartStartTimeRef.current) / 1000}
        isLegendHided={true}
        isLoading={isDataLoading}
      />
    </GraphWrapper>
  );
};

export default DashboardChartSystemLoad;
