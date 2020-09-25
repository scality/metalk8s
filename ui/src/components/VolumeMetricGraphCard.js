import React, { useEffect } from 'react';
import { useHistory } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';
import { LineChart, Dropdown } from '@scality/core-ui';
import {
  fetchVolumeStatsAction,
  updateVolumeStatsAction,
} from '../ducks/app/monitoring';
import {
  fontSize,
  padding,
  fontWeight,
} from '@scality/core-ui/dist/style/theme';
import {
  addMissingDataPoint,
  fromUnixTimestampToDate,
} from '../services/utils';
import {
  VOLUME_CONDITION_LINK,
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
import { intl } from '../translations/IntlGlobalProvider';

const MetricGraphCardContainer = styled.div`
  min-height: 270px;
  background-color: ${(props) => props.theme.brand.primaryDark1};
  margin: ${padding.small};
  padding-bottom: ${padding.large};
`;

const MetricGraphTitle = styled.div`
  color: ${(props) => props.theme.brand.textPrimary};
  font-size: ${fontSize.base};
  font-weight: ${fontWeight.bold};
  padding: ${padding.small} 0 0 ${padding.large};
  display: flex;
  .sc-dropdown {
    padding-left: 25px;
  }
`;

const GraphsContainer = styled.div`
  display: flex;
  flex-direction: column;
  padding-left: ${padding.small};
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
  padding: ${padding.small} 0 0 ${padding.larger};
`;

const UsageGraph = styled.div`
  min-width: 308px;
`;

const LatencyGraph = styled.div`
  min-width: 308px;
  padding-left: ${padding.large};
`;

const TroughputGraph = styled.div`
  min-width: 308px;
`;

const IOPSGraph = styled.div`
  min-width: 308px;
  padding-left: ${padding.large};
`;

// No data rendering should be extracted to an common style
const NoMetricsText = styled.div`
  color: ${(props) => props.theme.brand.textPrimary};
  font-size: ${fontSize.base};
  padding: ${padding.small} 0 0 ${padding.larger};
`;

const NoDataGraphText = styled.div`
  color: ${(props) => props.theme.brand.textPrimary};
  font-size: ${fontSize.small};
  padding: ${padding.small} 0 0 ${padding.larger};
`;

const MetricGraphCard = (props) => {
  const { volumeCondition, volumeMetricGraphData, volumeName } = props;
  const dispatch = useDispatch();
  const history = useHistory();
  const query = new URLSearchParams(history?.location?.search);
  const metricsTimeSpan = useSelector(
    (state) => state.app.monitoring.volumeStats.metricsTimeSpan,
  );

  // reference array to ensure consistency in encoding/decoding query params
  const queryTimeSpansCodes = [
    {
      label: 'now-7d',
      value: LAST_SEVEN_DAYS,
    },
    {
      label: 'now-24h',
      value: LAST_TWENTY_FOUR_HOURS,
    },
    {
      label: 'now-1h',
      value: LAST_ONE_HOUR,
    },
  ];
  
  // write the selected timespan in URL
  const writeUrlTimeSpan = (timespan) => {
    let formatted = queryTimeSpansCodes.find(item => item.value === timespan);
    
    if (formatted) {
      // preserves current query params
      query.set('from', formatted.label);
      history.push({search : query.toString()});
    }
  }

  const handleUrlQuery = () => {
    const urlTimeSpan = queryTimeSpansCodes.find(
      item => item.label === query.get('from')
    );

    // If a time span is specified we apply it
    // Else if a timespan has been set but is not in the URL yet (change of volume) we write it to the URL
    if (urlTimeSpan) {
      dispatch(updateVolumeStatsAction({ metricsTimeSpan: urlTimeSpan.value }));
      updateMetricsGraph();
    } else if (metricsTimeSpan !== LAST_TWENTY_FOUR_HOURS && !urlTimeSpan) {
      writeUrlTimeSpan(metricsTimeSpan);
    }
  }
  
  // handle timespan in url query
  useEffect(handleUrlQuery, [volumeName]);

  const updateMetricsGraph = () => dispatch(fetchVolumeStatsAction());

  const queryStartingTime = volumeMetricGraphData?.queryStartingTime;
  // the item chosed by the metrics time span dropdown
  // we should have a unified unit, second, for all the props related to prometheus
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

  // We need to manually add the missing data points due to the shutdown of VM
  const operateMetricRawData = (metricRawData) =>
    addMissingDataPoint(
      metricRawData,
      queryStartingTime,
      sampleDuration,
      sampleFrequency,
    );

  const volumeUsageOperated = operateMetricRawData(
    volumeMetricGraphData?.volumeUsage,
  );
  const volumeLatencyWriteOperated = operateMetricRawData(
    volumeMetricGraphData?.volumeLatencyWrite,
  );
  const volumeLatencyReadOperated = operateMetricRawData(
    volumeMetricGraphData?.volumeLatencyRead,
  );
  const volumeThroughputWriteOperated = operateMetricRawData(
    volumeMetricGraphData?.volumeThroughputWrite,
  );
  const volumeThroughputReadOperated = operateMetricRawData(
    volumeMetricGraphData?.volumeThroughputRead,
  );
  const volumeIOPSReadOperated = operateMetricRawData(
    volumeMetricGraphData?.volumeIOPSRead,
  );
  const volumeIOPSWriteOperated = operateMetricRawData(
    volumeMetricGraphData?.volumeIOPSWrite,
  );

  // slot[0] => timestamp
  // slot[1] => value

  const volumeUsageData = volumeUsageOperated?.map((slot) => {
    return {
      date: fromUnixTimestampToDate(slot[0]),
      y: slot[1] === null ? null : Math.round(slot[1] * 100),
    };
  });

  const volumeLatencyWriteData = volumeLatencyWriteOperated?.map((slot) => {
    return {
      date: fromUnixTimestampToDate(slot[0]),
      write: slot[1],
      type: 'write',
    };
  });

  const volumeLatencyReadData = volumeLatencyReadOperated?.map((slot) => {
    return {
      date: fromUnixTimestampToDate(slot[0]),
      read: slot[1],
      type: 'read',
    };
  });

  const volumeThroughputWriteData = volumeThroughputWriteOperated?.map(
    (slot) => {
      return {
        date: fromUnixTimestampToDate(slot[0]),
        write: slot[1],
        type: 'write',
      };
    },
  );

  const volumeThroughtReadData = volumeThroughputReadOperated?.map((slot) => {
    return {
      date: fromUnixTimestampToDate(slot[0]),
      read: slot[1],
      type: 'read',
    };
  });

  const volumeIOPSReadData = volumeIOPSReadOperated?.map((slot) => {
    return {
      date: fromUnixTimestampToDate(slot[0]),
      read: slot[1] === null ? null : slot[1],
      type: 'read',
    };
  });

  const volumeIOPSWriteData = volumeIOPSWriteOperated?.map((slot) => {
    return {
      date: fromUnixTimestampToDate(slot[0]),
      write: slot[1] === null ? null : slot[1],
      type: 'write',
    };
  });

  const volumeThroughputData = volumeThroughputWriteData?.concat(
    volumeThroughtReadData,
  );

  const volumeIOPSData = volumeIOPSWriteData?.concat(volumeIOPSReadData);

  const volumeLatencyData = volumeLatencyWriteData?.concat(
    volumeLatencyReadData,
  );

  const xAxis = {
    field: 'date',
    type: 'temporal',
    axis: {
      // Refer to all the available time format: https://github.com/d3/d3-time-format#locale_format
      format: '%m/%d %H:%M',
      // Boolean value that determines whether the axis should include ticks.
      ticks: true,
      tickCount: 4,
      labelAngle: -50,
      labelColor: '#a8b5c1',
    },
    title: null,
  };

  const yAxis = [
    {
      field: 'write',
      type: 'quantitative',
      // automatically add the unit for y axis labels: display 40k instead of 40000.  axis: { title: null, format: '~s' },
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
      // the max value of usage chart should always be 100%
      scale: { domain: [0, 100] },
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

  const colors = {
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

  // the time span of metrics graph, by default is `Last 24 hours`
  const metricsTimeSpanItems = [
    {
      label: LAST_SEVEN_DAYS,
      onClick: () => {
        dispatch(updateVolumeStatsAction({ metricsTimeSpan: LAST_SEVEN_DAYS }));
        writeUrlTimeSpan(LAST_SEVEN_DAYS);
        updateMetricsGraph();
      },
      selected: metricsTimeSpan === LAST_SEVEN_DAYS,
    },
    {
      label: LAST_TWENTY_FOUR_HOURS,
      onClick: () => {
        dispatch(
          updateVolumeStatsAction({ metricsTimeSpan: LAST_TWENTY_FOUR_HOURS }),
        );
        writeUrlTimeSpan(LAST_TWENTY_FOUR_HOURS);
        updateMetricsGraph();
      },
      selected: metricsTimeSpan === LAST_TWENTY_FOUR_HOURS,
    },
    {
      label: LAST_ONE_HOUR,
      onClick: () => {
        dispatch(updateVolumeStatsAction({ metricsTimeSpan: LAST_ONE_HOUR }));
        writeUrlTimeSpan(LAST_ONE_HOUR);
        updateMetricsGraph();
      },
      selected: metricsTimeSpan === LAST_ONE_HOUR,
    },
  ];

  const metricsTimeSpanDropdownItems = metricsTimeSpanItems?.filter(
    (mTS) => mTS.label !== metricsTimeSpan,
  );

  return (
    <MetricGraphCardContainer>
      <MetricGraphTitle>
        {intl.translate('metrics')}
        {volumeCondition === VOLUME_CONDITION_LINK && (
          <Dropdown
            items={metricsTimeSpanDropdownItems}
            text={metricsTimeSpan}
            size="smaller"
          />
        )}
      </MetricGraphTitle>
      {volumeCondition === VOLUME_CONDITION_LINK ? (
        <GraphsContainer>
          <RowGraphContainer>
            <UsageGraph>
              <GraphTitle>USAGE (%)</GraphTitle>
              {volumeUsageData?.length > 0 ? (
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
              ) : (
                <NoDataGraphText>No available usage data</NoDataGraphText>
              )}
            </UsageGraph>
            <LatencyGraph>
              <GraphTitle>LATENCY (µs) </GraphTitle>
              {volumeLatencyData?.length > 0 ? (
                <LineChart
                  id={'volume_latency_id'}
                  data={volumeLatencyData}
                  xAxis={xAxis}
                  yAxis={yAxis}
                  color={colors}
                  width={285}
                  height={80}
                  tooltip={false}
                />
              ) : (
                <NoDataGraphText>No available latency data</NoDataGraphText>
              )}
            </LatencyGraph>
          </RowGraphContainer>
          <SecondRowGraphContainer>
            <TroughputGraph>
              <GraphTitle>THROUGHPUT (MB/s)</GraphTitle>
              {volumeThroughputData?.length > 0 ? (
                <LineChart
                  id={'volume_throughput_id'}
                  data={volumeThroughputData}
                  xAxis={xAxis}
                  yAxis={yAxis}
                  color={colors}
                  width={285}
                  height={80}
                  tooltip={false}
                />
              ) : (
                <NoDataGraphText>No available throughput data</NoDataGraphText>
              )}
            </TroughputGraph>
            <IOPSGraph>
              <GraphTitle>IOPS</GraphTitle>
              {volumeIOPSData?.length > 0 ? (
                <LineChart
                  id={'volume_IOPS_id'}
                  data={volumeIOPSData}
                  xAxis={xAxis}
                  yAxis={yAxis}
                  color={colors}
                  width={285}
                  height={80}
                  tooltip={false}
                />
              ) : (
                <NoDataGraphText>No available IOPS data</NoDataGraphText>
              )}
            </IOPSGraph>
          </SecondRowGraphContainer>
        </GraphsContainer>
      ) : (
        <NoMetricsText>{intl.translate('volume_is_not_bound')}</NoMetricsText>
      )}
    </MetricGraphCardContainer>
  );
};

export default MetricGraphCard;
