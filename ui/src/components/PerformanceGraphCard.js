import React from 'react';
import styled from 'styled-components';
import {
  fontSize,
  padding,
  fontWeight,
} from '@scality/core-ui/dist/style/theme';
import { bytesToSize } from '../services/utils';
import { LineChart, Dropdown } from '@scality/core-ui';
import { intl } from '../translations/IntlGlobalProvider';

const PerformanceGraphCardContainer = styled.div`
  background-color: ${(props) => props.theme.brand.primaryDark1};
  /* min-height: 250px; */
  margin: ${padding.small};
  padding-bottom: 20px;
`;

const PerformanceGraphTitle = styled.div`
  color: ${(props) => props.theme.brand.textPrimary};
  font-size: ${fontSize.base};
  font-weight: ${fontWeight.bold};
  padding: 10px 0 0 29px;
  display: flex;
  .sc-dropdown {
    padding-left: 25px;
  }
`;

const GraphsContainer = styled.div`
  display: flex;
  flex-direction: column;
  padding-left: 10px;
`;

const RowGraphContainer = styled.div`
  display: flex;
  flex-direction: row;
  padding-left: 3px;
`;

const SecondRowGraphContainer = styled.div`
  display: flex;
  flex-direction: row;
  padding-left: 3px;
`;

const GraphTitle = styled.div`
  font-size: ${fontSize.small};
  font-weight: ${fontWeight.bold};
  color: ${(props) => props.theme.brand.textSecondary};
  padding: 10px 0 0 22px;
`;

const UsageGraph = styled.div`
  min-width: 308px;
`;

const LatencyGraph = styled.div`
  min-width: 308px;
  padding-left: 20px;
`;

const TroughputGraph = styled.div`
  min-width: 227px;
`;

const IOPSGraph = styled.div`
  min-width: 227px;
  padding-left: 20px;
`;

const PerformanceGraphCard = (props) => {
  const {
    volumeUsed,
    volumeStorageCapacity,
    volumeLatency,
    volumeThroughputWrite,
    volumeThroughputRead,
    volumeIOPSRead,
    volumeIOPSWrite,
  } = props;

  // slot[0] => timestamp
  // slot[1] => value
  const volumeUsageData = volumeUsed?.map((slot) => {
    return {
      date: new Date(slot[0] * 1000), // convert from the RFC 3339 to time in JS
      usageWithUnit: bytesToSize(slot[1]),
      y:
        slot[1] === null
          ? null
          : Math.round((slot[1] / volumeStorageCapacity) * 100),
    };
  });

  const volumeLatencyData = volumeLatency?.map((slot) => {
    return {
      date: new Date(slot[0] * 1000),
      y: slot[1] === null ? null : Math.round(slot[1] * 1000000),
    };
  });

  const volumeThroughputWriteData = volumeThroughputWrite?.map((slot) => {
    return {
      date: new Date(slot[0] * 1000),
      write: slot[1] === null ? null : slot[1],
      type: 'write',
    };
  });

  const volumeThroughtReadData = volumeThroughputRead?.map((slot) => {
    return {
      date: new Date(slot[0] * 1000),
      read: slot[1] === null ? null : slot[1],
      type: 'read',
    };
  });

  const volumeIOPSReadData = volumeIOPSRead?.map((slot) => {
    return {
      date: new Date(slot[0] * 1000),
      read: slot[1] === null ? null : slot[1],
      type: 'read',
    };
  });

  const volumeIOPSWriteData = volumeIOPSWrite?.map((slot) => {
    return {
      date: new Date(slot[0] * 1000),
      write: slot[1] === null ? null : slot[1],
      type: 'write',
    };
  });

  const volumeThroughputData = volumeThroughputWriteData?.concat(
    volumeThroughtReadData,
  );
  const volumeIOPSData = volumeIOPSWriteData?.concat(volumeIOPSReadData);

  const xAxis = {
    field: 'date',
    type: 'temporal',
    axis: {
      // Refer to all the available time format: https://github.com/d3/d3-time-format#locale_format
      format: '%d %b',
      // Boolean value that determines whether the axis should include ticks.
      ticks: true,
      tickCount: 4,
      labelAngle: -50,
      labelColor: '#a8b5c1',
    },
    title: null,
  };

  const yAxisThroughput = [
    {
      field: 'write',
      type: 'quantitative',
      axis: { title: null, format: '~s' },
    },
    {
      field: 'read',
      type: 'quantitative',
      axis: { title: null, format: '~s' },
    },
  ];

  const yAxisIOPS = [
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

  const yAxisUsauge = [
    {
      field: 'y',
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

  const colorLatency = {
    field: 'type',
    type: 'nominal',
    legend: null,
    domain: ['y'],
    scale: {
      range: ['#BA43A9'],
    },
  };

  const colorThroughput = {
    field: 'type',
    type: 'nominal',
    legend: {
      direction: 'horizontal',
      orient: 'bottom',
      title: null,
      symbolType: 'stroke',
      labelFontSize: 15,
      columnPadding: 50,
      symbolStrokeWidth: 5,
    },
    domain: ['write', 'read'],
    scale: {
      range: ['#73BF69', '#E0B400'],
    },
  };

  const colorIOPS = {
    field: 'type',
    type: 'nominal',
    legend: {
      direction: 'horizontal',
      orient: 'bottom',
      title: null,
      symbolType: 'stroke',
      labelFontSize: 15,
      columnPadding: 50,
      symbolStrokeWidth: 5,
    },
    domain: ['write', 'read'],
    scale: {
      range: ['#B877D9', '#FF9830'],
    },
  };
  return (
    <PerformanceGraphCardContainer>
      <PerformanceGraphTitle>
        {intl.translate('performances')}
        <Dropdown items={[]} text="7 days" size="smaller" />
      </PerformanceGraphTitle>
      <GraphsContainer>
        <RowGraphContainer>
          <UsageGraph>
            <GraphTitle>USAGE (%)</GraphTitle>
            <LineChart
              id={'volume_usage_id'}
              data={volumeUsageData}
              xAxis={xAxis}
              yAxis={yAxisUsauge}
              color={colorUsage}
              width={285}
              height={80}
              tooltip={false}
            />
          </UsageGraph>
          <LatencyGraph>
            <GraphTitle>LATENCY (µs) </GraphTitle>
            <LineChart
              id={'volume_latency_id'}
              data={volumeLatencyData}
              xAxis={xAxis}
              yAxis={yAxisUsauge}
              color={colorLatency}
              width={285}
              height={80}
              tooltip={false}
            />
          </LatencyGraph>
        </RowGraphContainer>
        <SecondRowGraphContainer>
          <TroughputGraph>
            <GraphTitle>THROUGHPUT (bytes/s)</GraphTitle>
            <LineChart
              id={'volume_throughput_id'}
              data={volumeThroughputData}
              xAxis={xAxis}
              yAxis={yAxisThroughput}
              color={colorThroughput}
              width={285}
              height={80}
              tooltip={false}
            />
          </TroughputGraph>
          <IOPSGraph>
            <GraphTitle>IOPS</GraphTitle>
            <LineChart
              id={'volume_IOPS_id'}
              data={volumeIOPSData}
              xAxis={xAxis}
              yAxis={yAxisIOPS}
              color={colorIOPS}
              width={285}
              height={80}
              tooltip={false}
            />
          </IOPSGraph>
        </SecondRowGraphContainer>
      </GraphsContainer>
      )
    </PerformanceGraphCardContainer>
  );
};

export default PerformanceGraphCard;
