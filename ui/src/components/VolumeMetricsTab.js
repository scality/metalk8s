import React, { useEffect } from 'react';
import { useHistory } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';
import { LineChart, Dropdown, Button } from '@scality/core-ui';
import {
  fetchVolumeStatsAction,
  updateVolumeStatsAction,
} from '../ducks/app/monitoring';
import { fontSize, padding } from '@scality/core-ui/dist/style/theme';
import {
  addMissingDataPoint,
  fromUnixTimestampToDate,
  useDynamicChartSize,
} from '../services/utils';
import { yAxisUsage, yAxisWriteRead } from './LinechartSpec';
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
  queryTimeSpansCodes,
} from '../constants';
import { useIntl } from 'react-intl';
import {
  VolumeTab,
  MetricsActionContainer,
  GraphsContainer,
  RowGraphContainer,
  GraphTitle,
  GraphWrapper,
} from './style/CommonLayoutStyle';

const MetricGraphCardContainer = styled.div`
  min-height: 270px;
`;

// No data rendering should be extracted to an common style
const NoMetricsText = styled.div`
  color: ${(props) => props.theme.textPrimary};
  font-size: ${fontSize.base};
  padding: ${padding.small} 0 0 ${padding.larger};
`;

const NoDataGraphText = styled.div`
  color: ${(props) => props.theme.textPrimary};
  font-size: ${fontSize.small};
  padding: ${padding.small} 0 0 ${padding.larger};
`;

const MetricsTab = (props) => {
  const {
    volumeCondition,
    volumeMetricGraphData,
    volumeName,
    volumeNamespace,
    volumePVCName,
  } = props;
  const dispatch = useDispatch();
  const history = useHistory();
  const intl = useIntl();
  const query = new URLSearchParams(history?.location?.search);
  const theme = useSelector((state) => state.config.theme);
  const metricsTimeSpan = useSelector(
    (state) => state.app.monitoring.volumeStats.metricsTimeSpan,
  );
  const config = useSelector((state) => state.config);
  const [graphWidth, graphHeight] = useDynamicChartSize('graph_container');

  // write the selected timespan in URL
  const writeUrlTimeSpan = (timespan: string) => {
    let formatted = queryTimeSpansCodes.find((item) => item.value === timespan);

    if (formatted) {
      // preserves current query params
      query.set('from', formatted.label);
      history.push({ search: query.toString() });
    }
  };

  const handleUrlQuery = () => {
    const urlTimeSpan = queryTimeSpansCodes.find(
      (item) => item.label === query.get('from'),
    );

    // If a time span is specified we apply it
    // Else if a timespan has been set but is not in the URL yet (change of volume) we write it to the URL
    if (urlTimeSpan) {
      dispatch(updateVolumeStatsAction({ metricsTimeSpan: urlTimeSpan.value }));
      updateMetricsGraph();
    } else if (metricsTimeSpan !== LAST_TWENTY_FOUR_HOURS && !urlTimeSpan) {
      writeUrlTimeSpan(metricsTimeSpan);
    }
  };

  // handle timespan in url query
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(handleUrlQuery, [volumeName, query.get('from'), metricsTimeSpan]);

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
      labelColor: theme.textSecondary,
    },
    title: null,
  };

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
      'data-cy': LAST_SEVEN_DAYS,
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
      'data-cy': LAST_TWENTY_FOUR_HOURS,
    },
    {
      label: LAST_ONE_HOUR,
      onClick: () => {
        dispatch(updateVolumeStatsAction({ metricsTimeSpan: LAST_ONE_HOUR }));
        writeUrlTimeSpan(LAST_ONE_HOUR);
        updateMetricsGraph();
      },
      selected: metricsTimeSpan === LAST_ONE_HOUR,
      'data-cy': LAST_ONE_HOUR,
    },
  ];

  const metricsTimeSpanDropdownItems = metricsTimeSpanItems?.filter(
    (mTS) => mTS.label !== metricsTimeSpan,
  );

  return (
    <VolumeTab>
      <MetricGraphCardContainer>
        <MetricsActionContainer>
          {config.api?.url_grafana && volumeNamespace && volumePVCName && (
            <Button
              text={intl.formatMessage({ id: 'advanced_metrics' })}
              variant={'buttonSecondary'}
              onClick={() => {}}
              icon={<i className="fas fa-external-link-alt" />}
              size={'small'}
              href={`${config.api.url_grafana}/dashboard/db/kubernetes-persistent-volumes?var-namespace=${volumeNamespace}&var-volume=${volumePVCName}`}
              target="_blank"
              rel="noopener noreferrer"
              data-cy="advanced_metrics_volume_detailed"
            />
          )}
          {volumeCondition === VOLUME_CONDITION_LINK && (
            <Dropdown
              items={metricsTimeSpanDropdownItems}
              text={metricsTimeSpan}
              size="small"
              data-cy="metrics_timespan_selection"
            />
          )}
        </MetricsActionContainer>
        {volumeCondition === VOLUME_CONDITION_LINK ? (
          <GraphsContainer id="graph_container">
            <RowGraphContainer>
              <GraphWrapper>
                <GraphTitle>Usage (%)</GraphTitle>
                {volumeUsageData?.length > 0 && graphWidth ? (
                  <LineChart
                    id={'volume_usage_id'}
                    data={volumeUsageData}
                    xAxis={xAxis}
                    yAxis={yAxisUsage}
                    color={colorUsage}
                    width={graphWidth}
                    height={graphHeight}
                    tooltip={false}
                  />
                ) : (
                  <NoDataGraphText>No available usage data</NoDataGraphText>
                )}
              </GraphWrapper>
              <GraphWrapper>
                <GraphTitle>Latency (µs) </GraphTitle>
                {volumeLatencyData?.length > 0 && graphWidth ? (
                  <LineChart
                    id={'volume_latency_id'}
                    data={volumeLatencyData}
                    xAxis={xAxis}
                    yAxis={yAxisWriteRead}
                    color={colors}
                    width={graphWidth}
                    height={graphHeight}
                    tooltip={false}
                  />
                ) : (
                  <NoDataGraphText>No available latency data</NoDataGraphText>
                )}
              </GraphWrapper>
            </RowGraphContainer>
            <RowGraphContainer>
              <GraphWrapper>
                <GraphTitle>Throughput (MB/s)</GraphTitle>
                {volumeThroughputData?.length > 0 && graphWidth ? (
                  <LineChart
                    id={'volume_throughput_id'}
                    data={volumeThroughputData}
                    xAxis={xAxis}
                    yAxis={yAxisWriteRead}
                    color={colors}
                    width={graphWidth}
                    height={graphHeight}
                    tooltip={false}
                  />
                ) : (
                  <NoDataGraphText>
                    No available throughput data
                  </NoDataGraphText>
                )}
              </GraphWrapper>
              <GraphWrapper>
                <GraphTitle>IOPS</GraphTitle>
                {volumeIOPSData?.length > 0 && graphWidth ? (
                  <LineChart
                    id={'volume_IOPS_id'}
                    data={volumeIOPSData}
                    xAxis={xAxis}
                    yAxis={yAxisWriteRead}
                    color={colors}
                    width={graphWidth}
                    height={graphHeight}
                    tooltip={false}
                  />
                ) : (
                  <NoDataGraphText>No available IOPS data</NoDataGraphText>
                )}
              </GraphWrapper>
            </RowGraphContainer>
          </GraphsContainer>
        ) : (
          <NoMetricsText>
            {intl.formatMessage({ id: 'volume_is_not_bound' })}
          </NoMetricsText>
        )}
      </MetricGraphCardContainer>
    </VolumeTab>
  );
};

export default MetricsTab;
