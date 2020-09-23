import React from 'react';
import { useSelector } from 'react-redux';
import styled from 'styled-components';
import {
  fontSize,
  padding,
  fontWeight,
} from '@scality/core-ui/dist/style/theme';
import { LineChart, Loader } from '@scality/core-ui';
import { TabContainer } from './CommonLayoutStyle';
import {
  addMissingDataPoint,
  fromUnixTimestampToDate,
} from '../services/utils';
import {
  LAST_SEVEN_DAYS,
  LAST_TWENTY_FOUR_HOURS,
  LAST_ONE_HOUR,
  SAMPLE_DURATION_LAST_SEVEN_DAYS,
  SAMPLE_DURATION_LAST_TWENTY_FOUR_HOURS,
  SAMPLE_DURATION_LAST_ONE_HOUR,
  SAMPLE_FREQUENCY_LAST_SEVEN_DAYS,
  SAMPLE_FREQUENCY_LAST_TWENTY_FOUR_HOURS,
  SAMPLE_FREQUENCY_LAST_ONE_HOUR,
} from '../constants';

const GraphsContainer = styled.div`
  display: flex;
  flex-direction: column;
  padding-left: ${padding.small};
`;

const GraphTitle = styled.div`
  font-size: ${fontSize.small};
  font-weight: ${fontWeight.bold};
  color: ${(props) => props.theme.brand.textSecondary};
  padding: ${padding.small} 0 0 ${padding.larger};
`;

const RowGraphContainer = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-around;
  padding-left: 3px;
`;

const Graph = styled.div`
  min-width: 308px;
  padding-right: 40px;
`;

const LoaderContainer = styled(Loader)`
  padding-left: ${padding.larger};
`;

const NodePageMetricsTab = (props) => {
  const { nodeStats } = props;
  const theme = useSelector((state) => state.config.theme);
  const metricsTimeSpan = useSelector(
    (state) => state.app.monitoring.volumeStats.metricsTimeSpan,
  );

  let sampleDuration = null;
  let sampleFrequency = null;
  if (metricsTimeSpan === LAST_SEVEN_DAYS) {
    // do the query every 1 hour
    sampleDuration = SAMPLE_DURATION_LAST_SEVEN_DAYS;
    sampleFrequency = SAMPLE_FREQUENCY_LAST_SEVEN_DAYS;
  } else if (metricsTimeSpan === LAST_TWENTY_FOUR_HOURS) {
    // do the query every 1 minute
    sampleDuration = SAMPLE_DURATION_LAST_TWENTY_FOUR_HOURS;
    sampleFrequency = SAMPLE_FREQUENCY_LAST_TWENTY_FOUR_HOURS;
  } else if (metricsTimeSpan === LAST_ONE_HOUR) {
    // do the query every 1 second
    sampleDuration = SAMPLE_DURATION_LAST_ONE_HOUR;
    sampleFrequency = SAMPLE_FREQUENCY_LAST_ONE_HOUR;
  }

  // slot[0] => timestamp
  // slot[1] => value
  // We need to manually add the missing data points due to the shutdown of VM
  const queryStartingTime = nodeStats?.queryStartingTime;
  const operateMetricRawData = (metricRawData) =>
    addMissingDataPoint(
      metricRawData,
      queryStartingTime,
      sampleDuration,
      sampleFrequency,
    );

  const typedMetrics = {
    cpuUsage: 'y',
    systemLoad: 'y',
    memory: 'y',
    iopsRead: 'read',
    iopsWrite: 'write',
    controlPlaneNetworkBandwidthIn: 'in',
    controlPlaneNetworkBandwidthOut: 'out',
    workloadPlaneNetworkBandwidthIn: 'in',
    workloadPlaneNetworkBandwidthOut: 'out',
  };

  const nodeStatsData = Object.keys(nodeStats).reduce((acc, metricName) => {
    const data = operateMetricRawData(nodeStats[metricName][0]?.values);

    let extra = {};
    const metricType = typedMetrics[metricName];
    if (metricType !== undefined) extra.type = metricType;

    acc[metricName] = data.map((slot) => ({
      date: fromUnixTimestampToDate(slot[0]),
      [metricType]: slot[1],
      ...extra,
    }));
    return acc;
  }, {});

  // Combine the read/write, in/out into one dataset
  const iopsData = nodeStatsData['iopsRead']?.concat(
    nodeStatsData['iopsWrite'],
  );
  const controlPlaneNetworkBandwidthData = nodeStatsData[
    'controlPlaneNetworkBandwidthIn'
  ]?.concat(nodeStatsData['controlPlaneNetworkBandwidthOut']);
  const workloadPlaneNetworkBandwidthData = nodeStatsData[
    'workloadPlaneNetworkBandwidthIn'
  ]?.concat(nodeStatsData['workloadPlaneNetworkBandwidthOut']);

  const xAxis = {
    field: 'date',
    type: 'temporal',
    axis: {
      // Refer to all the available time format: https://github.com/d3/d3-time-format#locale_format
      // format: '%m/%d %H:%M',
      format: '%H:%M', // when the timespan is `Last 24 hours`
      // Boolean value that determines whether the axis should include ticks.
      ticks: true,
      tickCount: 4,
      labelAngle: -50,
      labelColor: theme.brand.textSecondary,
    },
    title: null,
  };
  const yAxisUsauge = [
    {
      field: 'y',
      type: 'quantitative',
      axis: { title: null },
      // the max value of usage chart should always be 100%
      scale: { domain: [0, 100] },
    },
  ];
  const yAxis = [
    {
      field: 'y',
      type: 'quantitative',
      axis: { title: null },
    },
  ];
  const yAxisWriteRead = [
    {
      field: 'write',
      type: 'quantitative',
      axis: { title: null },
    },
    {
      field: 'read',
      type: 'quantitative',
      axis: { title: null },
    },
  ];
  const yAxisInOut = [
    {
      field: 'in',
      type: 'quantitative',
      axis: { title: null },
    },
    {
      field: 'out',
      type: 'quantitative',
      axis: { title: null },
    },
  ];
  const colorUsage = {
    field: 'type',
    type: 'nominal',
    legend: null,
    domain: ['y'],
    scale: {
      range: ['#6ED0E0'],
    },
  };

  // the `read` and `out` should be the same color
  // the `write` and `in` should be the same color
  const colorsWriteRead = {
    field: 'type',
    type: 'nominal',
    legend: {
      direction: 'horizontal',
      orient: 'bottom',
      title: null,
      symbolType: 'stroke',
      labelFontSize: 15,
      columnPadding: 50,
      symbolStrokeWidth: 2,
    },
    domain: ['read', 'write'],
    scale: {
      range: ['#73BF69', '#E0B400'],
    },
  };
  const colorsInOut = {
    field: 'type',
    type: 'nominal',
    legend: {
      direction: 'horizontal',
      orient: 'bottom',
      title: null,
      symbolType: 'stroke',
      labelFontSize: 15,
      columnPadding: 50,
      symbolStrokeWidth: 2,
    },
    domain: ['in', 'out'],
    scale: {
      range: ['#E0B400', '#73BF69'],
    },
  };
  const lineConfig = { strokeWidth: 1.5 };

  return (
    <TabContainer>
      <GraphsContainer>
        <RowGraphContainer>
          <Graph>
            <GraphTitle>CPU USAGE (%)</GraphTitle>
            {nodeStatsData['cpuUsage'].length !== 0 ? (
              <LineChart
                id={'node_cpu_usage_id'}
                data={nodeStatsData['cpuUsage']}
                xAxis={xAxis}
                yAxis={yAxisUsauge}
                color={colorUsage}
                width={window.innerWidth / 4 - 50}
                height={window.innerHeight / 6 - 30}
                tooltip={false}
                lineConfig={lineConfig}
              />
            ) : (
              <LoaderContainer size="small"></LoaderContainer>
            )}
          </Graph>
          <Graph>
            <GraphTitle>CPU SYSTEM LOAD (%)</GraphTitle>
            {nodeStatsData['systemLoad'].length !== 0 ? (
              <LineChart
                id={'node_system_load_id'}
                data={nodeStatsData['systemLoad']}
                xAxis={xAxis}
                yAxis={yAxis}
                color={colorUsage}
                width={window.innerWidth / 4 - 50}
                height={window.innerHeight / 6 - 30}
                tooltip={false}
                lineConfig={lineConfig}
              />
            ) : (
              <LoaderContainer size="small"></LoaderContainer>
            )}
          </Graph>
        </RowGraphContainer>
        <RowGraphContainer>
          <Graph>
            <GraphTitle>MEMORY (%)</GraphTitle>
            {nodeStatsData['memory'].length !== 0 ? (
              <LineChart
                id={'node_memory_id'}
                data={nodeStatsData['memory']}
                xAxis={xAxis}
                yAxis={yAxisUsauge}
                color={colorUsage}
                width={window.innerWidth / 4 - 50}
                height={window.innerHeight / 6 - 30}
                tooltip={false}
                lineConfig={lineConfig}
              />
            ) : (
              <LoaderContainer size="small"></LoaderContainer>
            )}
          </Graph>
          <Graph>
            <GraphTitle>IOPS</GraphTitle>
            {iopsData.length !== 0 ? (
              <LineChart
                id={'node_IOPS_id'}
                data={iopsData}
                xAxis={xAxis}
                yAxis={yAxisWriteRead}
                color={colorsWriteRead}
                width={window.innerWidth / 4 - 50}
                height={window.innerHeight / 6 - 30}
                tooltip={false}
                lineConfig={lineConfig}
              />
            ) : (
              <LoaderContainer size="small"></LoaderContainer>
            )}
          </Graph>
        </RowGraphContainer>

        <RowGraphContainer>
          <Graph>
            <GraphTitle>CONTROL PLANE BANDWIDTH (MB)</GraphTitle>
            {controlPlaneNetworkBandwidthData.length !== 0 ? (
              <LineChart
                id={'node_control_plane_bandwidth_id'}
                data={controlPlaneNetworkBandwidthData}
                xAxis={xAxis}
                yAxis={yAxisInOut}
                color={colorsInOut}
                width={window.innerWidth / 4 - 50}
                height={window.innerHeight / 6 - 30}
                tooltip={false}
                lineConfig={lineConfig}
              />
            ) : (
              <LoaderContainer size="small"></LoaderContainer>
            )}
          </Graph>
          <Graph>
            <GraphTitle>WORKLOAD PLANE BANDWIDTH (MB)</GraphTitle>
            {workloadPlaneNetworkBandwidthData.length !== 0 ? (
              <LineChart
                id={'node_workload_plane_bandwidth_id'}
                data={workloadPlaneNetworkBandwidthData}
                xAxis={xAxis}
                yAxis={yAxisInOut}
                color={colorsInOut}
                width={window.innerWidth / 4 - 50}
                height={window.innerHeight / 6 - 30}
                tooltip={false}
                lineConfig={lineConfig}
              />
            ) : (
              <LoaderContainer size="small"></LoaderContainer>
            )}
          </Graph>
        </RowGraphContainer>
      </GraphsContainer>
    </TabContainer>
  );
};

export default NodePageMetricsTab;
