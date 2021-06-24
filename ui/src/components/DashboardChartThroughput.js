import React, { useCallback } from 'react';
import { LineChart, Loader } from '@scality/core-ui';
import { getTooltipConfig, yAxisThroughput } from './LinechartSpec';
import { colorRange, GraphTitle, GraphWrapper } from './DashboardMetrics';
import { formatNodesThroughputPromRangeForChart } from '../services/graphUtils';
import { useQuery } from 'react-query';
import {
  queryThroughputRead,
  queryThroughputWrite,
} from '../services/prometheus/fetchMetrics';
import { useNodeAddressesSelector, useNodes } from '../hooks';
import type { DashboardChartProps } from '../containers/DashboardPage';

const DashboardChartThroughput = (props: DashboardChartProps) => {
  const nodeAddresses = useNodeAddressesSelector(useNodes());

  const getThroughputColorRange = (size: number): Array<string> => {
    const res = [];

    for (let i = 0; i < size; i++) {
      if (colorRange[i]) {
        // Adding twice the same color to have the same line color for both read and write
        res.push(colorRange[i]);
        res.push(colorRange[i]);
      }
    }
    return res;
  };

  const tooltipConfig = getTooltipConfig(
    ((nodes) => {
      let res = [];
      nodes.forEach((element) => {
        res.push({
          field: `${element.name.replace('.', '\\.')}-read`,
          type: 'quantitative',
          title: `${element.name}-read`,
          formatType: 'throughputFormatter',
        });
        res.push({
          field: `${element.name.replace('.', '\\.')}-write`,
          type: 'quantitative',
          title: `${element.name}-write`,
          format: '.2f',
        });
      });
      return res;
    })(nodeAddresses),
  );

  const color = {
    field: 'type',
    type: 'nominal',
    scale: {
      range: getThroughputColorRange(nodeAddresses.length),
    },
    legend: null,
  };

  // Passing nodes table as a react-queries identifier so if a node is added/removed the data are refreshed
  // Also it makes the data to auto-refresh based on the node refresh timeout that is already implemented
  const throughputQuery = useQuery(
    ['throughputQuery', nodeAddresses, props.metricsTimeSpan],
    useCallback(
      () =>
        Promise.all([
          queryThroughputRead(props.metricsTimeSpan),
          queryThroughputWrite(props.metricsTimeSpan),
        ]).then((result) =>
          formatNodesThroughputPromRangeForChart(result, nodeAddresses),
        ),
      [nodeAddresses, props.metricsTimeSpan],
    ),
    props.reactQueryOptions,
  );

  return (
    <GraphWrapper>
      <GraphTitle>
        <div>Throughput (MB/s)</div>
        {throughputQuery.isLoading && <Loader />}
      </GraphTitle>

      <LineChart
        id={'dashboard_throughput_id'}
        data={throughputQuery.data}
        xAxis={props.xAxis}
        yAxis={yAxisThroughput}
        color={color}
        width={props.graphWidth - 35}
        height={props.graphHeight}
        lineConfig={props.lineConfig}
        tooltip={true}
        tooltipConfig={tooltipConfig}
        tooltipTheme={'custom'}
      />
    </GraphWrapper>
  );
};

export default DashboardChartThroughput;
