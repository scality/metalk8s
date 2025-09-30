import { Icon, Toggle, spacing } from '@scality/core-ui';
import {
  Button,
  ChartLegend,
  ChartLegendWrapper,
} from '@scality/core-ui/dist/next';
import React from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router';
import styled from 'styled-components';

import { useIntl } from 'react-intl';
import MetricChart from '../components/MetricChart';
import MetricSymmetricalChart from '../components/MetricSymmetricalChart';
import {
  GraphWrapper,
  MetricsActionContainer,
} from '../components/style/CommonLayoutStyle';
import {
  CLUSTER_AVERAGE,
  GRAFANA_DASHBOARDS,
  lineColor1,
  PORT_NODE_EXPORTER,
  UNIT_RANGE_BS,
} from '../constants';
import { updateNodeStatsFetchArgumentAction } from '../ducks/app/monitoring';
import type { NodesState } from '../ducks/app/nodes';
import { useTypedSelector } from '../hooks';
import {
  getCPUUsageAvgQuery,
  getCPUUsageQuery,
  getControlPlaneBandWidthAvgInQuery,
  getControlPlaneBandWidthAvgOutQuery,
  getControlPlaneBandWidthInQuery,
  getControlPlaneBandWidthOutQuery,
  getIOPSReadAvgQuery,
  getIOPSReadQuery,
  getIOPSWriteAvgQuery,
  getIOPSWriteQuery,
  getMemoryAvgQuery,
  getMemoryQuery,
  getSystemLoadAvgQuery,
  getSystemLoadQuery,
  getWorkloadPlaneBandWidthAvgInQuery,
  getWorkloadPlaneBandWidthAvgOutQuery,
  getWorkloadPlaneBandWidthInQuery,
  getWorkloadPlaneBandWidthOutQuery,
} from '../services/platformlibrary/metrics';
import { useURLQuery } from '../services/utils';
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
  padding-left: ${spacing.r12};
  /* 100% - padding - action container height */
  height: calc(100% - 3rem);
  overflow: auto;
`;
const MetricsToggleWrapper = styled.div`
  display: flex;
  align-items: center;
  flex: 1;

  .sc-toggle {
    margin-right: ${spacing.r8};
  }
`;
const NoDataAvailable = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: ${spacing.r4};
  padding-top: ${spacing.r40};
  height: 1rem;
`;
export const RenderNoDataAvailable = () => {
  const intl = useIntl();
  return (
    <NoDataAvailable>
      <Icon name="Exclamation-circle" />
      {intl.formatMessage({
        id: 'no_data_available_for_metrics',
      })}
    </NoDataAvailable>
  );
};

const NodePageMetricsTab = ({
  nodeName,
  instanceIP,
  controlPlaneInterface,
  workloadPlaneInterface,
  nodesIPsInfo,
}: {
  nodeName: string;
  instanceIP: string;
  controlPlaneInterface: string;
  workloadPlaneInterface: string;
  nodesIPsInfo: NodesState['IPsInfo'];
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const query = useURLQuery();
  const intl = useIntl();
  const api = useTypedSelector((state) => state.config.api);
  const showAvg = useTypedSelector(
    (state) => state.app.monitoring.nodeStats.showAvg,
  );

  // Create color set

  const colorSet = {
    [nodeName]: lineColor1,
  };
  if (showAvg) {
    colorSet[CLUSTER_AVERAGE] = lineColor1;
  }
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
    navigate({
      search: query.toString(),
    });
  };

  return (
    <>
      <MetricsActionContainer>
        <MetricsToggleWrapper>
          {instanceIP && (
            <Toggle
              name="showAvg"
              label={intl.formatMessage({
                id: 'show_cluster_avg',
              })}
              toggle={showAvg}
              // @ts-expect-error - FIXME when you are working on it
              value={showAvg}
              onChange={(e: React.SyntheticEvent<HTMLInputElement>) => {
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
              label={intl.formatMessage({
                id: 'advanced_metrics',
              })}
              variant={'secondary'}
              icon={<Icon name="External-link" />}
              disabled={instanceIP === ''}
            />
          </a>
        )}
        {instanceIP && <TimespanSelector />}
      </MetricsActionContainer>
      {instanceIP ? (
        <ChartLegendWrapper colorSet={colorSet}>
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
              <ChartLegend shape="line" legendSize="Smaller" />
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
              <ChartLegend shape="line" legendSize="Smaller" />
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
              <ChartLegend shape="line" legendSize="Smaller" />
            </GraphWrapper>
            <GraphWrapper className="iops">
              <MetricSymmetricalChart
                title={'IOPS'}
                yAxisTitle={'write(+) / read(-)'}
                nodesIPsInfo={nodesIPsInfo}
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
              <ChartLegend shape="line" legendSize="Smaller" />
            </GraphWrapper>
            <GraphWrapper className="cpbandwidth">
              <MetricSymmetricalChart
                title={'Control Plane Bandwidth'}
                yAxisTitle={'in(+) / out(-)'}
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
              <ChartLegend shape="line" legendSize="Smaller" />
            </GraphWrapper>
            <GraphWrapper className="wpbandwidth">
              <MetricSymmetricalChart
                title={'Workload Plane Bandwidth'}
                yAxisTitle={'in(+) / out(-)'}
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
              <ChartLegend shape="line" legendSize="Smaller" />
            </GraphWrapper>
          </GraphGrid>
        </ChartLegendWrapper>
      ) : (
        <RenderNoDataAvailable />
      )}
    </>
  );
};

export default NodePageMetricsTab;
