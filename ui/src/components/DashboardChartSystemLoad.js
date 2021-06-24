import React from 'react';
import { LineChart, Loader } from '@scality/core-ui';
import { yAxis } from './LinechartSpec';
import { useQueries } from 'react-query';
import { queryNodeLoadMetrics } from '../services/prometheus/fetchMetrics';
import { colorRange, GraphTitle, GraphWrapper } from './DashboardMetrics';
import { formatNodesPromRangeForChart } from '../services/graphUtils';
import { useNodeAddressesSelector, useNodes } from '../hooks';
import type { DashboardChartProps } from '../containers/DashboardPage';

const DashboardChartSystemLoad = (props: DashboardChartProps) => {
  const nodeAddresses = useNodeAddressesSelector(useNodes());
  const color = {
    field: 'type',
    type: 'nominal',
    scale: {
      range: colorRange,
    },
    legend: nodeAddresses.length
      ? {
          direction: 'horizontal',
          orient: 'bottom',
          title: null,
          labelFontSize: 12,
          symbolSize: 300,
          columns: 3,
          values: nodeAddresses.map((node) => node.name),
        }
      : null,
  };

  // Passing nodes table as a react-queries identifier so if a node is added/removed the data are refreshed
  // Also it makes the data to auto-refresh based on the node refresh timeout that is already implemented
  const loadDataQuery = useQueries(
    nodeAddresses.map((node) => {
      return {
        queryKey: ['nodeMetricsLoad', node.name, props.metricsTimeSpan],
        queryFn: () =>
          queryNodeLoadMetrics(node.internalIP, props.metricsTimeSpan),
        ...props.reactQueryOptions,
      };
    }),
  );

  const isNodeLoading = loadDataQuery.some((query) => query.isLoading);

  return (
    <GraphWrapper>
      <GraphTitle>
        <div>System Load (%)</div>
        {isNodeLoading && <Loader />}
      </GraphTitle>

      <LineChart
        id={'dashboard_load_id'}
        data={formatNodesPromRangeForChart(
          loadDataQuery.map((query) => query.data),
          nodeAddresses,
        )}
        xAxis={props.xAxis}
        yAxis={yAxis}
        color={color}
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

export default DashboardChartSystemLoad;
