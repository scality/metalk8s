//@flow
import React from 'react';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router';
import styled from 'styled-components';
import { LineChart, Loader, Dropdown, Button, Toggle } from '@scality/core-ui';
import { padding } from '@scality/core-ui/dist/style/theme';
import {
  updateNodeStatsFetchArgumentAction,
  MonitoringMetrics,
} from '../ducks/app/monitoring';
import {
  yAxisUsage,
  yAxis,
  getTooltipConfig,
} from '../components/LinechartSpec';
import {
  NodeTab,
  MetricsActionContainer,
  GraphTitle,
  GraphWrapper,
} from '../components/style/CommonLayoutStyle';
import {
  addMissingDataPoint,
  fromUnixTimestampToDate,
  useURLQuery,
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
import { useTypedSelector } from '../hooks';

const GraphGrid = styled.div`
  display: grid;
  gap: 8px;
  grid-template:
    'cpuusage systemload' 1fr
    'memory iops ' 1fr
    'cpbandwidth wpbandwidth' 1fr
    / 1fr 1fr;
  .sc-vegachart svg {
    background-color: inherit !important;
  }
  .cpuusage {
    grid-area: cpuusage;
  }
  .systemLoad {
    grid-area: systemLoad;
  }
  .memory {
    grid-area: memory;
  }
  .iops {
    grid-area: iops;
  }
  .cpbandwidth {
    grid-area: cpbandwidth;
  }
  .wpbandwidth {
    grid-area: wpbandwidth;
  }
  padding-left: ${padding.small};
`;

const MetricsToggleWrapper = styled.div`
  display: flex;
  align-items: center;
  flex: 1;

  .sc-toggle {
    margin-right: ${padding.small};
  }
`;

const NodePageMetricsTab = ({
  nodeName,
  nodeStats,
  instanceIP,
  avgStats,
}: {
  nodeName: string,
  nodeStats: MonitoringMetrics,
  instanceIP: string,
  avgStats: MonitoringMetrics,
}) => {
  const dispatch = useDispatch();
  const theme = useTypedSelector((state) => state.config.theme);
  const history = useHistory();
  const query = useURLQuery();
  const api = useTypedSelector((state) => state.config.api);
  const metricsTimeSpan = useTypedSelector(
    (state) => state.app.monitoring.nodeStats.metricsTimeSpan,
  );
  const showAvg = useTypedSelector(
    (state) => state.app.monitoring.nodeStats.showAvg,
  );

  const [graphWidth, graphHeight] = useDynamicChartSize('graph_container');

  // To redirect to the right Node(Detailed) dashboard in Grafana
  const unameInfos = useTypedSelector(
    (state) => state.app.monitoring.unameInfo,
  );
  const hostnameLabel = unameInfos.find(
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
    cpuUsage: 'CPU Usage',
    systemLoad: 'System Load',
    memory: 'Memory',
    iopsRead: 'Read',
    iopsWrite: 'Write',
    controlPlaneNetworkBandwidthIn: 'In',
    controlPlaneNetworkBandwidthOut: 'Out',
    workloadPlaneNetworkBandwidthIn: 'In',
    workloadPlaneNetworkBandwidthOut: 'Out',
  };

  const typedAvgMetrics = {
    cpuUsage: 'cluster avg',
    systemLoad: 'cluster avg',
    memory: 'cluster avg',
    iopsRead: 'read avg',
    iopsWrite: 'write avg',
    controlPlaneNetworkBandwidthIn: 'in avg',
    controlPlaneNetworkBandwidthOut: 'out avg',
    workloadPlaneNetworkBandwidthIn: 'in avg',
    workloadPlaneNetworkBandwidthOut: 'out avg',
  };

  const nodeStatsData = Object.keys(nodeStats).reduce((acc, metricName) => {
    const data = operateMetricRawData(nodeStats[metricName][0]?.values);

    let extra = {};
    const metricType = typedMetrics[metricName];
    if (metricType !== undefined) extra.type = metricType;

    /*
     ** Using 'symbol': 'A' because vega-lite internally assign the plain line
     ** to the first alphabetical item when strokeDash is used
     */
    acc[metricName] = data.map((slot) => ({
      date: fromUnixTimestampToDate(slot[0]),
      y: slot[1],
      symbol: 'A',
      ...extra,
    }));
    return acc;
  }, {});

  const avgStatsData = Object.keys(avgStats).reduce((acc, metricName) => {
    const data = operateMetricRawData(avgStats[metricName][0]?.values);

    let extra = {};
    const metricType = typedAvgMetrics[metricName];
    if (metricType !== undefined) extra.type = metricType;

    acc[metricName] = data.map((slot) => ({
      date: fromUnixTimestampToDate(slot[0]),
      y: slot[1],
      symbol: 'Cluster avg',
      ...extra,
    }));
    return acc;
  }, {});

  let cpuData = nodeStatsData['cpuUsage'];
  let systemLoadData = nodeStatsData['systemLoad'];
  let memoryData = nodeStatsData['memory'];
  // Combine the read/write, in/out into one dataset
  let iopsData = nodeStatsData['iopsRead'].concat(nodeStatsData['iopsWrite']);
  let controlPlaneNetworkBandwidthData = nodeStatsData[
    'controlPlaneNetworkBandwidthIn'
  ].concat(nodeStatsData['controlPlaneNetworkBandwidthOut']);
  let workloadPlaneNetworkBandwidthData = nodeStatsData[
    'workloadPlaneNetworkBandwidthIn'
  ].concat(nodeStatsData['workloadPlaneNetworkBandwidthOut']);

  if (showAvg) {
    cpuData = cpuData.concat(avgStatsData['cpuUsage']);
    systemLoadData = systemLoadData.concat(avgStatsData['systemLoad']);
    memoryData = memoryData.concat(avgStatsData['memory']);
    iopsData = iopsData
      .concat(avgStatsData['iopsRead'])
      .concat(avgStatsData['iopsWrite']);
    controlPlaneNetworkBandwidthData = controlPlaneNetworkBandwidthData
      .concat(avgStatsData['controlPlaneNetworkBandwidthIn'])
      .concat(avgStatsData['controlPlaneNetworkBandwidthOut']);
    workloadPlaneNetworkBandwidthData = workloadPlaneNetworkBandwidthData
      .concat(avgStatsData['workloadPlaneNetworkBandwidthIn'])
      .concat(avgStatsData['workloadPlaneNetworkBandwidthOut']);
  }

  // Tooltip Custom Spec
  const ttpCPUSpec = [
    {
      field: 'CPU Usage',
      type: 'quantitative',
      title: `CPU Usage - ${nodeName}`,
      format: '.1f',
    },
  ];
  const ttpSystemLoadSpec = [
    {
      field: 'System Load',
      type: 'quantitative',
      title: `System Load - ${nodeName}`,
      format: '.1f',
    },
  ];
  const ttpMemorySpec = [
    {
      field: 'Memory',
      type: 'quantitative',
      title: `Memory - ${nodeName}`,
      format: '.1f',
    },
  ];
  const ttpIOPSSpec = [
    {
      field: `Read`,
      type: 'quantitative',
      title: `Read - ${nodeName}`,
      format: '.1f',
    },
    {
      field: 'Write',
      type: 'quantitative',
      title: `Write - ${nodeName}`,
      format: '.1f',
    },
  ];
  const ttpInOutSpec = [
    {
      field: 'In',
      type: 'quantitative',
      title: `In - ${nodeName}`,
      format: '.2f',
    },
    {
      field: 'Out',
      type: 'quantitative',
      title: `Out - ${nodeName}`,
      format: '.2f',
    },
  ];
  if (showAvg) {
    ttpCPUSpec.push({
      field: 'cluster avg',
      type: 'quantitative',
      title: `CPU Usage - ${intl.translate('cluster_avg')}`,
      format: '.1f',
    });
    ttpSystemLoadSpec.push({
      field: 'cluster avg',
      type: 'quantitative',
      title: `System Load - ${intl.translate('cluster_avg')}`,
      format: '.1f',
    });
    ttpMemorySpec.push({
      field: 'cluster avg',
      type: 'quantitative',
      title: `Memory - ${intl.translate('cluster_avg')}`,
      format: '.1f',
    });
    ttpIOPSSpec.push(
      {
        field: 'read avg',
        type: 'quantitative',
        title: `Read - ${intl.translate('cluster_avg')}`,
        format: '.1f',
      },
      {
        field: 'write avg',
        type: 'quantitative',
        title: `Write - ${intl.translate('cluster_avg')}`,
        format: '.1f',
      },
    );
    ttpInOutSpec.push(
      {
        field: 'in avg',
        type: 'quantitative',
        title: `In - ${intl.translate('cluster_avg')}`,
        format: '.2f',
      },
      {
        field: 'out avg',
        type: 'quantitative',
        title: `Out - ${intl.translate('cluster_avg')}`,
        format: '.2f',
      },
    );
  }
  const tooltipConfigCPU = getTooltipConfig(ttpCPUSpec);
  const tooltipConfigSystemLoad = getTooltipConfig(ttpSystemLoadSpec);
  const tooltipConfigMemory = getTooltipConfig(ttpMemorySpec);
  const tooltipConfigIops = getTooltipConfig(ttpIOPSSpec);
  const tooltipConfigInOut = getTooltipConfig(ttpInOutSpec);

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
      labelColor: theme.textSecondary,
    },
    title: null,
  };

  const strokeDashConfig = {
    field: 'symbol',
    type: 'nominal',
    legend: {
      direction: 'horizontal',
      orient: 'bottom',
      title: null,
      values: [`${intl.translate('cluster_avg')}.`],
      symbolSize: 300,
      labelFontSize: 12,
    },
  };

  const opacityConfig = {
    condition: {
      test: 'datum.symbol == "Cluster avg"',
      value: 0.5,
    },
    value: 1,
  };

  // the `read` and `out` should be the same color
  // the `write` and `in` should be the same color
  const colorCPU = {
    field: 'type',
    type: 'nominal',
    scale: { range: ['#9645c2'] },
    legend: {
      direction: 'horizontal',
      orient: 'bottom',
      title: null,
      values: showAvg ? ['CPU Usage'] : [''],
      labelFontSize: 12,
      symbolSize: 300,
    },
  };

  const colorSystemLoad = {
    field: 'type',
    type: 'nominal',
    scale: { range: ['#9645c2'] },
    legend: {
      direction: 'horizontal',
      orient: 'bottom',
      title: null,
      values: showAvg ? ['System Load'] : [''],
      labelFontSize: 12,
      symbolSize: 300,
    },
  };

  const colorMemory = {
    field: 'type',
    type: 'nominal',
    scale: { range: ['#9645c2'] },
    legend: {
      direction: 'horizontal',
      orient: 'bottom',
      title: null,
      values: showAvg ? ['Memory'] : [''],
      labelFontSize: 12,
      symbolSize: 300,
    },
  };

  const colorsWriteRead = {
    field: 'type',
    type: 'nominal',
    legend: {
      direction: 'horizontal',
      orient: 'bottom',
      title: null,
      symbolType: 'stroke',
      symbolSize: 300,
      labelFontSize: 12,
      columnPadding: 15,
      symbolStrokeWidth: 2,
      values: ['Read', 'Write'],
    },
    domain: ['Read', 'Write'],
    scale: {
      range: showAvg
        ? ['#9645c2', '#bfaa7f', '#9645c2', '#bfaa7f']
        : ['#9645c2', '#bfaa7f'],
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
      symbolSize: 300,
      labelFontSize: 12,
      columnPadding: 15,
      symbolStrokeWidth: 2,
      values: ['In', 'Out'],
    },
    domain: ['In', 'Out'],
    scale: {
      range: showAvg
        ? ['#bfaa7f', '#9645c2', '#bfaa7f', '#9645c2']
        : ['#bfaa7f', '#9645c2'],
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

  // write show avg value in URL
  const writeShowAvg = (showAvgValue) => {
    query.set('avg', showAvgValue);
    history.push({ search: query.toString() });
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

  const metricsTimeSpanDropdownItems = metricsTimeSpanItems.filter(
    (mTS) => mTS.label !== metricsTimeSpan,
  );

  return (
    <NodeTab>
      <MetricsActionContainer>
        <MetricsToggleWrapper>
          <Toggle
            name="showAvg"
            label={intl.translate('show_cluster_avg')}
            toggle={showAvg}
            value={showAvg}
            onChange={(e: SyntheticEvent<HTMLInputElement>) => {
              writeShowAvg(e.currentTarget.checked);
              dispatch(
                updateNodeStatsFetchArgumentAction({
                  showAvg: e.currentTarget.checked,
                }),
              );
            }}
          />
          {showAvg && !avgStatsData['cpuUsage'].length ? <Loader /> : null}
        </MetricsToggleWrapper>
        {api && api.url_grafana && (
          <Button
            text={intl.translate('advanced_metrics')}
            variant={'buttonSecondary'}
            icon={<i className="fas fa-external-link-alt" />}
            size={'small'}
            href={`${api.url_grafana}/dashboard/db/nodes-detailed?var-DS_PROMETHEUS=Prometheus&var-job=node-exporter&var-name=${hostnameLabel}`}
            target="_blank"
            rel="noopener noreferrer"
            data-cy="advanced_metrics_node_detailed"
          />
        )}
        <Dropdown
          items={metricsTimeSpanDropdownItems}
          text={metricsTimeSpan}
          size="small"
          data-cy="metrics_timespan_selection"
        />
      </MetricsActionContainer>
      <GraphGrid id="graph_container">
        <GraphWrapper className="cpuusage">
          <GraphTitle>
            <div>CPU Usage (%)</div>
            {!cpuData.length && <Loader />}
          </GraphTitle>
          {graphWidth !== 0 && (
            <LineChart
              id={'node_cpu_usage_id'}
              data={cpuData.length ? cpuData : []}
              xAxis={xAxis}
              yAxis={cpuData.length ? yAxisUsage : yAxis}
              color={colorCPU}
              width={graphWidth}
              height={graphHeight}
              tooltip={true}
              tooltipConfig={tooltipConfigCPU}
              lineConfig={lineConfig}
              strokeDashEncodingConfig={showAvg && strokeDashConfig}
              opacityEncodingConfig={opacityConfig}
              tooltipTheme={'dark'}
            />
          )}
        </GraphWrapper>
        <GraphWrapper className="systemload">
          <GraphTitle>
            <div>CPU System Load (%)</div>
            {!systemLoadData.length && <Loader />}
          </GraphTitle>
          {graphWidth !== 0 && (
            <LineChart
              id={'node_system_load_id'}
              data={systemLoadData ? systemLoadData : []}
              xAxis={xAxis}
              yAxis={yAxis}
              color={colorSystemLoad}
              width={graphWidth}
              height={graphHeight}
              tooltip={true}
              tooltipConfig={tooltipConfigSystemLoad}
              lineConfig={lineConfig}
              strokeDashEncodingConfig={showAvg && strokeDashConfig}
              opacityEncodingConfig={opacityConfig}
              tooltipTheme={'dark'}
            />
          )}
        </GraphWrapper>

        <GraphWrapper className="memory">
          <GraphTitle>
            <div> Memory (%)</div>
            {!memoryData.length && <Loader />}
          </GraphTitle>
          {graphWidth !== 0 && (
            <LineChart
              id={'node_memory_id'}
              data={memoryData.length ? memoryData : []}
              xAxis={xAxis}
              yAxis={memoryData.length ? yAxisUsage : yAxis}
              color={colorMemory}
              width={graphWidth}
              height={graphHeight}
              tooltip={true}
              tooltipConfig={tooltipConfigMemory}
              lineConfig={lineConfig}
              strokeDashEncodingConfig={showAvg && strokeDashConfig}
              opacityEncodingConfig={opacityConfig}
              tooltipTheme={'dark'}
            />
          )}
        </GraphWrapper>
        <GraphWrapper className="iops">
          <GraphTitle>
            <div>IOPS</div>
            {!iopsData.length && <Loader />}
          </GraphTitle>
          {graphWidth !== 0 && (
            <LineChart
              id={'node_IOPS_id'}
              data={iopsData.length ? iopsData : []}
              xAxis={xAxis}
              yAxis={yAxis}
              color={colorsWriteRead}
              width={graphWidth}
              height={graphHeight}
              tooltip={true}
              tooltipConfig={tooltipConfigIops}
              lineConfig={lineConfig}
              strokeDashEncodingConfig={showAvg && strokeDashConfig}
              opacityEncodingConfig={opacityConfig}
              tooltipTheme={'dark'}
            />
          )}
        </GraphWrapper>
        <GraphWrapper className="cpbandwidth">
          <GraphTitle>
            <div>Control Plane Bandwidth (MB/s)</div>
            {!controlPlaneNetworkBandwidthData.length && <Loader />}
          </GraphTitle>
          {graphWidth !== 0 && (
            <LineChart
              id={'node_control_plane_bandwidth_id'}
              data={
                controlPlaneNetworkBandwidthData.length
                  ? controlPlaneNetworkBandwidthData
                  : []
              }
              xAxis={xAxis}
              yAxis={yAxis}
              color={colorsInOut}
              width={graphWidth}
              height={graphHeight}
              tooltip={true}
              tooltipConfig={tooltipConfigInOut}
              lineConfig={lineConfig}
              strokeDashEncodingConfig={showAvg && strokeDashConfig}
              opacityEncodingConfig={opacityConfig}
              tooltipTheme={'dark'}
            />
          )}
        </GraphWrapper>
        <GraphWrapper className="wpbandwidth">
          <GraphTitle>
            <div>Workload Plane Bandwidth (MB/s)</div>
            {!workloadPlaneNetworkBandwidthData.length && <Loader />}
          </GraphTitle>
          {graphWidth !== 0 && (
            <LineChart
              id={'node_workload_plane_bandwidth_id'}
              data={
                workloadPlaneNetworkBandwidthData.length
                  ? workloadPlaneNetworkBandwidthData
                  : []
              }
              xAxis={xAxis}
              yAxis={yAxis}
              color={colorsInOut}
              width={graphWidth}
              height={graphHeight}
              tooltip={true}
              tooltipConfig={tooltipConfigInOut}
              lineConfig={lineConfig}
              strokeDashEncodingConfig={showAvg && strokeDashConfig}
              opacityEncodingConfig={opacityConfig}
              tooltipTheme={'dark'}
            />
          )}
        </GraphWrapper>
      </GraphGrid>
    </NodeTab>
  );
};

export default NodePageMetricsTab;
