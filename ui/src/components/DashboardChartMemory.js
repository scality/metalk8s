import React from 'react';
import { LineChart, Loader } from '@scality/core-ui';
import { yAxisUsage } from './LinechartSpec';
import { GraphTitle, GraphWrapper } from './DashboardMetrics';
import { useQueries } from 'react-query';
import { queryNodeMemoryMetrics } from '../services/prometheus/fetchMetrics';
import { useNodes, useNodeAddressesSelector } from '../hooks';
import { formatNodesPromRangeForChart } from '../services/graphUtils';
import type { DashboardChartProps } from '../containers/DashboardPage';

const DashboardChartMemory = (props: DashboardChartProps) => {
  const nodeAddresses = useNodeAddressesSelector(useNodes());
  // Passing nodes table as a react-queries identifier so if a node is added/removed the data are refreshed
  // Also it makes the data to auto-refresh based on the node refresh timeout that is already implemented
  const memoryDataQuery = useQueries(
    nodeAddresses.map((node) => {
      return {
        queryKey: ['nodeMetricsMemory', node.name, props.metricsTimeSpan],
        queryFn: () =>
          queryNodeMemoryMetrics(node.internalIP, props.metricsTimeSpan),
        ...props.reactQueryOptions,
      };
    }),
  );

  const isNodeLoading = memoryDataQuery.some((query) => query.isLoading);

  return (
    <GraphWrapper>
      <GraphTitle>
        <div>Memory (%)</div>
        {isNodeLoading && <Loader />}
      </GraphTitle>
      <LineChart
        id={'dashboard_memory_id'}
        data={formatNodesPromRangeForChart(
          memoryDataQuery.map((query) => query.data),
          nodeAddresses,
        )}
        xAxis={props.xAxis}
        yAxis={yAxisUsage}
        color={props.perNodeColor}
        width={props.graphWidth - 35}
        height={props.graphHeight}
        lineConfig={props.lineConfig}
        tooltip={true}
        tooltipConfig={props.perNodeTooltip}
        tooltipTheme={'custom'}
      />
    </GraphWrapper>
  );
};

export default DashboardChartMemory;
