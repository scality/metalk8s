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

  const nodeStatsOperated = Object.keys(nodeStats).map((metricName) => {
    return {
      metrics: metricName,
      data: operateMetricRawData(nodeStats[metricName][0]?.values),
    };
  });

  const cpuUsageData = nodeStatsOperated
    ?.find((obj) => obj.metrics === 'cpuUsage')
    ?.data?.map((slot) => {
      return {
        date: fromUnixTimestampToDate(slot[0]),
        y: slot[1],
      };
    });

  const systemLoadData = nodeStatsOperated
    ?.find((obj) => obj.metrics === 'systemLoad')
    ?.data?.map((slot) => {
      return {
        date: fromUnixTimestampToDate(slot[0]),
        y: slot[1],
      };
    });

  const memoryData = nodeStatsOperated
    ?.find((obj) => obj.metrics === 'memory')
    ?.data?.map((slot) => {
      return {
        date: fromUnixTimestampToDate(slot[0]),
        y: slot[1],
      };
    });

  const nodeIOPSWriteData = nodeStatsOperated
    ?.find((obj) => obj.metrics === 'iopsRead')
    ?.data?.map((slot) => {
      return {
        date: fromUnixTimestampToDate(slot[0]),
        write: slot[1],
        type: 'write',
      };
    });

  const nodeIOPSReadData = nodeStatsOperated
    ?.find((obj) => obj.metrics === 'iopsWrite')
    ?.data?.map((slot) => {
      return {
        date: fromUnixTimestampToDate(slot[0]),
        read: slot[1],
        type: 'read',
      };
    });

  const nodeControlPlaneNetworkBandwidthInData = nodeStatsOperated
    ?.find((obj) => obj.metrics === 'controlPlaneNetworkBandwidthIn')
    ?.data?.map((slot) => {
      return {
        date: fromUnixTimestampToDate(slot[0]),
        in: slot[1],
        type: 'in',
      };
    });

  const nodeControlPlaneNetworkBandwidthOutData = nodeStatsOperated
    ?.find((obj) => obj.metrics === 'controlPlaneNetworkBandwidthOut')
    ?.data?.map((slot) => {
      return {
        date: fromUnixTimestampToDate(slot[0]),
        out: slot[1],
        type: 'out',
      };
    });

  const nodeWorkloadPlaneNetworkBandwidthInData = nodeStatsOperated
    ?.find((obj) => obj.metrics === 'workloadPlaneNetworkBandwidthIn')
    ?.data?.map((slot) => {
      return {
        date: fromUnixTimestampToDate(slot[0]),
        in: slot[1],
        type: 'in',
      };
    });
  const nodeWorkloadPlaneNetworkBandwidthOutData = nodeStatsOperated
    ?.find((obj) => obj.metrics === 'workloadPlaneNetworkBandwidthOut')
    ?.data?.map((slot) => {
      return {
        date: fromUnixTimestampToDate(slot[0]),
        out: slot[1],
        type: 'out',
      };
    });

  // Combine the read/write, in/out into one dataset
  const iopsData = nodeIOPSWriteData?.concat(nodeIOPSReadData);
  const controlPlaneNetworkBandwidthData = nodeControlPlaneNetworkBandwidthInData?.concat(
    nodeControlPlaneNetworkBandwidthOutData,
  );
  const workloadPlaneNetworkBandwidthData = nodeWorkloadPlaneNetworkBandwidthInData?.concat(
    nodeWorkloadPlaneNetworkBandwidthOutData,
  );

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
            {cpuUsageData.length !== 0 ? (
              <LineChart
                id={'node_cpu_usage_id'}
                data={cpuUsageData}
                xAxis={xAxis}
                yAxis={yAxisUsauge}
                color={colorUsage}
                width={315}
                height={95}
                tooltip={false}
                lineConfig={lineConfig}
              />
            ) : (
              <LoaderContainer size="small"></LoaderContainer>
            )}
          </Graph>
          <Graph>
            <GraphTitle>CPU SYSTEM LOAD (%)</GraphTitle>
            {systemLoadData.length !== 0 ? (
              <LineChart
                id={'node_system_load_id'}
                data={systemLoadData}
                xAxis={xAxis}
                yAxis={yAxis}
                color={colorUsage}
                width={315}
                height={95}
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
            {memoryData.length !== 0 ? (
              <LineChart
                id={'node_memory_id'}
                data={memoryData}
                xAxis={xAxis}
                yAxis={yAxisUsauge}
                color={colorUsage}
                width={315}
                height={95}
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
                width={315}
                height={95}
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
                width={315}
                height={95}
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
                width={315}
                height={95}
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
