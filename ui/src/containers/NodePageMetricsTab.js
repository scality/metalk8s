//@flow
import React from 'react';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router';
import styled from 'styled-components';
import { Toggle, BasicText } from '@scality/core-ui';
import { Button } from '@scality/core-ui/dist/next';
import { spacing } from '@scality/core-ui/dist/style/theme';
import { useIntl } from 'react-intl';
import { SyncedCursorCharts } from '@scality/core-ui/dist/next';
import { UNIT_RANGE_BS } from '@scality/core-ui/dist/components/linetemporalchart/LineTemporalChart.component';
import { updateNodeStatsFetchArgumentAction } from '../ducks/app/monitoring';
import {
  NodeTab,
  MetricsActionContainer,
  GraphWrapper,
} from '../components/style/CommonLayoutStyle';
import { useURLQuery } from '../services/utils';
import { PORT_NODE_EXPORTER, GRAFANA_DASHBOARDS } from '../constants';
import { useTypedSelector } from '../hooks';
import {
  getCPUUsageQuery,
  getCPUUsageAvgQuery,
  getIOPSWriteQuery,
  getIOPSReadQuery,
  getIOPSWriteAvgQuery,
  getIOPSReadAvgQuery,
  getSystemLoadQuery,
  getSystemLoadAvgQuery,
  getMemoryQuery,
  getMemoryAvgQuery,
  getControlPlaneBandWidthInQuery,
  getControlPlaneBandWidthOutQuery,
  getControlPlaneBandWidthAvgInQuery,
  getControlPlaneBandWidthAvgOutQuery,
  getWorkloadPlaneBandWidthInQuery,
  getWorkloadPlaneBandWidthOutQuery,
  getWorkloadPlaneBandWidthAvgInQuery,
  getWorkloadPlaneBandWidthAvgOutQuery,
} from '../services/platformlibrary/metrics';
import MetricChart from '../components/MetricChart';
import MetricSymmetricalChart from '../components/MetricSymmetricalChart';
import TimespanSelector from './TimespanSelector';

const GraphGrid = styled.div`
  display: grid;
  gap: 8px;
  grid-template:
    'cpuusage systemload' 1fr
    'memory iops' 1fr
    'cpbandwidth wpbandwidth' 1fr
    / 1fr 1fr;
  .sc-vegachart svg {
    background-color: inherit !important;
  }
  .cpuusage {
    grid-area: cpuusage;
  }
  .systemload {
    grid-area: systemload;
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
  padding-left: ${spacing.sp12};
  /* 100vh - navbar height - tab height - padding - action container height */
  height: calc(100vh - 3.357rem - 2.857rem - 40px - 2.286rem);
  overflow-y: auto;
`;

const MetricsToggleWrapper = styled.div`
  display: flex;
  align-items: center;
  flex: 1;

  .sc-toggle {
    margin-right: ${spacing.sp8};
  }
`;

const NoDataAvailable = styled.div`
  display: flex;
  padding-top: ${spacing.sp40};
  justify-content: center;
`;

const NodePageMetricsTab = ({
  nodeName,
  instanceIP,
  controlPlaneInterface,
  workloadPlaneInterface,
  nodesIPsInfo,
}: {
  nodeName: string,
  instanceIP: string,
  controlPlaneInterface: string,
  workloadPlaneInterface: string,
  nodesIPsInfo: [],
}) => {
  const dispatch = useDispatch();
  const history = useHistory();
  const query = useURLQuery();
  const intl = useIntl();
  const api = useTypedSelector((state) => state.config.api);

  const showAvg = useTypedSelector(
    (state) => state.app.monitoring.nodeStats.showAvg,
  );

  // To redirect to the right Node(Detailed) dashboard in Grafana
  const unameInfos = useTypedSelector(
    (state) => state.app.monitoring.unameInfo,
  );
  const hostnameLabel = unameInfos.find(
    (unameInfo) =>
      unameInfo?.metric?.instance === `${instanceIP}:${PORT_NODE_EXPORTER}`,
  )?.metric?.nodename;

  // write show avg value in URL
  const writeShowAvg = (showAvgValue) => {
    query.set('avg', showAvgValue);
    history.push({ search: query.toString() });
  };

  return (
    <NodeTab>
      <MetricsActionContainer>
        <MetricsToggleWrapper>
          {instanceIP && (
            <Toggle
              name="showAvg"
              label={intl.formatMessage({ id: 'show_cluster_avg' })}
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
          )}
        </MetricsToggleWrapper>
        {api && api.url_grafana && (
          <a
            href={`${api.url_grafana}/d/${GRAFANA_DASHBOARDS.nodes}?var-DS_PROMETHEUS=Prometheus&var-job=node-exporter&var-name=${hostnameLabel}`}
            target="_blank"
            rel="noopener noreferrer"
            data-cy="advanced_metrics_node_detailed"
          >
            <Button
              label={intl.formatMessage({ id: 'advanced_metrics' })}
              variant={'secondary'}
              icon={<i className="fas fa-external-link-alt" />}
              disabled={instanceIP === ''}
            />
          </a>
        )}
        {instanceIP && <TimespanSelector />}
      </MetricsActionContainer>
      {instanceIP ? (
        <SyncedCursorCharts>
          <GraphGrid id="graph_container">
            <GraphWrapper className="cpuusage">
              <MetricChart
                title={'CPU Usage'}
                yAxisType={'percentage'}
                nodeName={nodeName}
                instanceIP={instanceIP}
                showAvg={showAvg}
                getMetricQuery={getCPUUsageQuery}
                getMetricAvgQuery={getCPUUsageAvgQuery}
              ></MetricChart>
            </GraphWrapper>
            <GraphWrapper className="systemload">
              <MetricChart
                title={'CPU System Load'}
                yAxisType={'default'}
                nodeName={nodeName}
                instanceIP={instanceIP}
                showAvg={showAvg}
                getMetricQuery={getSystemLoadQuery}
                getMetricAvgQuery={getSystemLoadAvgQuery}
              ></MetricChart>
            </GraphWrapper>
            <GraphWrapper className="memory">
              <MetricChart
                title={'Memory'}
                yAxisType={'percentage'}
                nodeName={nodeName}
                instanceIP={instanceIP}
                showAvg={showAvg}
                getMetricQuery={getMemoryQuery}
                getMetricAvgQuery={getMemoryAvgQuery}
              ></MetricChart>
            </GraphWrapper>
            <GraphWrapper className="iops">
              <MetricSymmetricalChart
                title={'IOPS'}
                yAxisTitle={'write(+) / read(-)'}
                yAxisType={'symmetrical'}
                nodeName={nodeName}
                instanceIP={instanceIP}
                showAvg={showAvg}
                getMetricAboveQuery={getIOPSWriteQuery}
                getMetricBelowQuery={getIOPSReadQuery}
                getMetricAboveAvgQuery={getIOPSWriteAvgQuery}
                getMetricBelowAvgQuery={getIOPSReadAvgQuery}
                metricPrefixAbove={'write'}
                metricPrefixBelow={'read'}
                isPlaneInterfaceRequired={false}
              ></MetricSymmetricalChart>
            </GraphWrapper>
            <GraphWrapper className="cpbandwidth">
              <MetricSymmetricalChart
                title={'Control Plane Bandwidth'}
                yAxisTitle={'in(+) / out(-)'}
                yAxisType={'symmetrical'}
                nodeName={nodeName}
                instanceIP={instanceIP}
                showAvg={showAvg}
                nodesIPsInfo={nodesIPsInfo}
                getMetricAboveQuery={getControlPlaneBandWidthInQuery}
                getMetricBelowQuery={getControlPlaneBandWidthOutQuery}
                getMetricAboveAvgQuery={getControlPlaneBandWidthAvgInQuery}
                getMetricBelowAvgQuery={getControlPlaneBandWidthAvgOutQuery}
                metricPrefixAbove={'in'}
                metricPrefixBelow={'out'}
                planeInterface={controlPlaneInterface}
                unitRange={UNIT_RANGE_BS}
                isPlaneInterfaceRequired={true}
              ></MetricSymmetricalChart>
            </GraphWrapper>
            <GraphWrapper className="wpbandwidth">
              <MetricSymmetricalChart
                title={'Workload Plane Bandwidth'}
                yAxisTitle={'in(+) / out(-)'}
                yAxisType={'symmetrical'}
                nodeName={nodeName}
                instanceIP={instanceIP}
                showAvg={showAvg}
                nodesIPsInfo={nodesIPsInfo}
                getMetricAboveQuery={getWorkloadPlaneBandWidthInQuery}
                getMetricBelowQuery={getWorkloadPlaneBandWidthOutQuery}
                getMetricAboveAvgQuery={getWorkloadPlaneBandWidthAvgInQuery}
                getMetricBelowAvgQuery={getWorkloadPlaneBandWidthAvgOutQuery}
                metricPrefixAbove={'in'}
                metricPrefixBelow={'out'}
                planeInterface={workloadPlaneInterface}
                unitRange={UNIT_RANGE_BS}
                isPlaneInterfaceRequired={true}
              ></MetricSymmetricalChart>
            </GraphWrapper>
          </GraphGrid>
        </SyncedCursorCharts>
      ) : (
        <NoDataAvailable>
          <BasicText>
            <i
              className="fas fa-exclamation-triangle"
              style={{ paddingRight: `${spacing.sp4}` }}
            ></i>
            {intl.formatMessage({ id: 'no_data_available_for_metrics' })}
          </BasicText>
        </NoDataAvailable>
      )}
    </NodeTab>
  );
};

export default NodePageMetricsTab;
