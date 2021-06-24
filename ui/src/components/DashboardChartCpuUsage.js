import React from 'react';
import { LineChart, Loader } from '@scality/core-ui';
import { yAxisUsage } from './LinechartSpec';
import { GraphTitle, GraphWrapper } from './DashboardMetrics';
import { formatNodesPromRangeForChart } from '../services/graphUtils';
import { useQueries } from 'react-query';
import { queryNodeCPUMetrics } from '../services/prometheus/fetchMetrics';
import { useNodeAddressesSelector, useNodes } from '../hooks';
import type { DashboardChartProps } from '../containers/DashboardPage';

const DashboardChartCpuUsage = (props: DashboardChartProps) => {
  const nodeAddresses = useNodeAddressesSelector(useNodes());

  // Passing nodes table as a react-queries identifier so if a node is added/removed the data are refreshed
  // Also it makes the data to auto-refresh based on the node refresh timeout that is already implemented
  const cpuDataQuery = useQueries(
    nodeAddresses.map((node) => {
      return {
        queryKey: ['nodeMetricsCPU', node.name, props.metricsTimeSpan],
        queryFn: () =>
          queryNodeCPUMetrics(node.internalIP, props.metricsTimeSpan),
        ...props.reactQueryOptions,
      };
    }),
  );

  const isNodeLoading = cpuDataQuery.some((query) => query.isLoading);

  return (
    <GraphWrapper>
      <GraphTitle>
        <div>CPU Usage (%)</div>
        {isNodeLoading && <Loader />}
      </GraphTitle>
      <LineChart
        id={'dashboard_cpu_id'}
        data={formatNodesPromRangeForChart(
          cpuDataQuery.map((query) => query.data),
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

export default DashboardChartCpuUsage;
