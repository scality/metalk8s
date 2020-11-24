import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useHistory } from 'react-router';
import styled from 'styled-components';
import { padding } from '@scality/core-ui/dist/style/theme';
import { LineChart, Loader, Dropdown, Button } from '@scality/core-ui';
import { updateNodeStatsFetchArgumentAction } from '../ducks/app/monitoring';
import {
  yAxisUsage,
  yAxis,
  yAxisWriteRead,
  yAxisInOut,
} from '../components/LinechartSpec';
import {
  NodeTab,
  MetricsActionContainer,
  GraphsContainer,
  RowGraphContainer,
  GraphTitle,
  GraphWrapper,
} from '../components/CommonLayoutStyle';
import {
  addMissingDataPoint,
  fromUnixTimestampToDate,
  useQuery,
  useDynamicChartSize,
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
  queryTimeSpansCodes,
  PORT_NODE_EXPORTER,
} from '../constants';
import { intl } from '../translations/IntlGlobalProvider';

const LoaderContainer = styled(Loader)`
  padding-left: ${padding.larger};
`;

const DropdownContainer = styled.div`
  // TODO: Make the changes in core-ui
  .sc-dropdown {
    padding-left: 25px;
  }
  
  .sc-dropdown > div {
    background-color: ${(props) => props.theme.brand.primary};
    border: 1px solid ${(props) => props.theme.brand.borderLight}
    border-radius: 3px;
  }
  
  .sc-button {
    background-color: ${(props) => props.theme.brand.info};
  }
`;

const NodePageMetricsTab = (props) => {
  const { nodeStats, instanceIP } = props;
  const dispatch = useDispatch();
  const theme = useSelector((state) => state.config.theme);
  const history = useHistory();
  const query = useQuery();
  const config = useSelector((state) => state.config);
  const metricsTimeSpan = useSelector(
    (state) => state.app.monitoring.nodeStats.metricsTimeSpan,
  );
  const [graphWidth, graphHeight] = useDynamicChartSize('graph_container');

  // To redirect to the right Node(Detailed) dashboard in Grafana
  const unameInfos = useSelector((state) => state.app.monitoring.unameInfo);
  const hostnameLabel = unameInfos?.find(
    (unameInfo) =>
      unameInfo?.metric?.instance === `${instanceIP}:${PORT_NODE_EXPORTER}`,
  )?.metric?.nodename;

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
      format:
        metricsTimeSpan === (LAST_ONE_HOUR || LAST_TWENTY_FOUR_HOURS)
          ? '%H:%M'
          : '%m/%d',
      // Boolean value that determines whether the axis should include ticks.
      ticks: true,
      tickCount: 4,
      labelAngle: -50,
      labelColor: theme.brand.textSecondary,
    },
    title: null,
  };

  const colorUsage = {
    field: 'type',
    type: 'nominal',
    legend: null,
    domain: ['y'],
    scale: {
      range: ['#4BE4E2'],
    },
  };
  const colorSystemLoad = {
    field: 'type',
    type: 'nominal',
    legend: null,
    domain: ['y'],
    scale: {
      range: ['#A6B561'],
    },
  };
  const colorMemory = {
    field: 'type',
    type: 'nominal',
    legend: null,
    domain: ['y'],
    scale: {
      range: ['#1F78C1'],
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
      range: ['#968BFF', '#F6B187'],
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
      range: ['#F6B187', '#968BFF'],
    },
  };
  const lineConfig = { strokeWidth: 1.5 };

  // write the selected timespan in URL
  const writeUrlTimeSpan = (timespan) => {
    let formatted = queryTimeSpansCodes.find((item) => item.value === timespan);

    if (formatted) {
      query.set('from', formatted.label);
      history.push({ search: query.toString() });
    }
  };

  // Dropdown items
  const metricsTimeSpanItems = [
    LAST_SEVEN_DAYS,
    LAST_TWENTY_FOUR_HOURS,
    LAST_ONE_HOUR,
  ].map((option) => ({
    label: option,
    'data-cy': option,
    onClick: () => {
      dispatch(updateNodeStatsFetchArgumentAction({ metricsTimeSpan: option }));
      writeUrlTimeSpan(option);
    },
    selected: metricsTimeSpan === option,
  }));

  const metricsTimeSpanDropdownItems = metricsTimeSpanItems?.filter(
    (mTS) => mTS.label !== metricsTimeSpan,
  );

  return (
    <NodeTab>
      <MetricsActionContainer>
        <Button
          text={intl.translate('advanced_metrics')}
          variant={'base'}
          onClick={() => {}}
          icon={<i className="fas fa-external-link-alt" />}
          size={'small'}
          href={`${config.api.url_grafana}/dashboard/db/nodes-detailed?var-DS_PROMETHEUS=Prometheus&var-job=node-exporter&var-name=${hostnameLabel}`}
          target="_blank"
          rel="noopener noreferrer"
          data-cy="advanced_metrics_node_detailed"
        />
        <DropdownContainer>
          <Dropdown
            items={metricsTimeSpanDropdownItems}
            text={metricsTimeSpan}
            size="small"
            data-cy="metrics_timespan_selection"
          />
        </DropdownContainer>
      </MetricsActionContainer>
      <GraphsContainer id="graph_container">
        <RowGraphContainer>
          <GraphWrapper>
            <GraphTitle>CPU USAGE (%)</GraphTitle>
            {nodeStatsData['cpuUsage'].length !== 0 ? (
              <LineChart
                id={'node_cpu_usage_id'}
                data={nodeStatsData['cpuUsage']}
                xAxis={xAxis}
                yAxis={yAxisUsage}
                color={colorUsage}
                width={graphWidth}
                height={graphHeight}
                tooltip={false}
                lineConfig={lineConfig}
              />
            ) : (
              <LoaderContainer size="small"></LoaderContainer>
            )}
          </GraphWrapper>
          <GraphWrapper>
            <GraphTitle>CPU SYSTEM LOAD (%)</GraphTitle>
            {nodeStatsData['systemLoad'].length !== 0 ? (
              <LineChart
                id={'node_system_load_id'}
                data={nodeStatsData['systemLoad']}
                xAxis={xAxis}
                yAxis={yAxis}
                color={colorSystemLoad}
                width={graphWidth}
                height={graphHeight}
                tooltip={false}
                lineConfig={lineConfig}
              />
            ) : (
              <LoaderContainer size="small"></LoaderContainer>
            )}
          </GraphWrapper>
        </RowGraphContainer>
        <RowGraphContainer>
          <GraphWrapper>
            <GraphTitle>MEMORY (%)</GraphTitle>
            {nodeStatsData['memory'].length !== 0 ? (
              <LineChart
                id={'node_memory_id'}
                data={nodeStatsData['memory']}
                xAxis={xAxis}
                yAxis={yAxisUsage}
                color={colorMemory}
                width={graphWidth}
                height={graphHeight}
                tooltip={false}
                lineConfig={lineConfig}
              />
            ) : (
              <LoaderContainer size="small"></LoaderContainer>
            )}
          </GraphWrapper>
          <GraphWrapper>
            <GraphTitle>IOPS</GraphTitle>
            {iopsData.length !== 0 ? (
              <LineChart
                id={'node_IOPS_id'}
                data={iopsData}
                xAxis={xAxis}
                yAxis={yAxisWriteRead}
                color={colorsWriteRead}
                width={graphWidth}
                height={graphHeight}
                tooltip={false}
                lineConfig={lineConfig}
              />
            ) : (
              <LoaderContainer size="small"></LoaderContainer>
            )}
          </GraphWrapper>
        </RowGraphContainer>

        <RowGraphContainer>
          <GraphWrapper>
            <GraphTitle>CONTROL PLANE BANDWIDTH (MB)</GraphTitle>
            {controlPlaneNetworkBandwidthData.length !== 0 ? (
              <LineChart
                id={'node_control_plane_bandwidth_id'}
                data={controlPlaneNetworkBandwidthData}
                xAxis={xAxis}
                yAxis={yAxisInOut}
                color={colorsInOut}
                width={graphWidth}
                height={graphHeight}
                tooltip={false}
                lineConfig={lineConfig}
              />
            ) : (
              <LoaderContainer size="small"></LoaderContainer>
            )}
          </GraphWrapper>
          <GraphWrapper>
            <GraphTitle>WORKLOAD PLANE BANDWIDTH (MB)</GraphTitle>
            {workloadPlaneNetworkBandwidthData.length !== 0 ? (
              <LineChart
                id={'node_workload_plane_bandwidth_id'}
                data={workloadPlaneNetworkBandwidthData}
                xAxis={xAxis}
                yAxis={yAxisInOut}
                color={colorsInOut}
                width={graphWidth}
                height={graphHeight}
                tooltip={false}
                lineConfig={lineConfig}
              />
            ) : (
              <LoaderContainer size="small"></LoaderContainer>
            )}
          </GraphWrapper>
        </RowGraphContainer>
      </GraphsContainer>
    </NodeTab>
  );
};

export default NodePageMetricsTab;
