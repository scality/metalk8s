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
import { MetricsActionContainer } from '../components/style/CommonLayoutStyle';
import {
  GRAFANA_DASHBOARDS,
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
import { createColorSet } from '../services/graphUtils';
export const ChartContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing.r8};
  /* 100% - padding - action container height */
  height: calc(100% - 3rem);
  padding-left: ${spacing.r12};
`;
export const GraphGrid = styled.div`
  display: grid;
  gap: 8px;
  grid-template-columns: 1fr 1fr;
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
        <ChartLegendWrapper colorSet={createColorSet}>
          <ChartContainer>
            <GraphGrid id="graph_container">
              <MetricChart
                title={'CPU Usage'}
                yAxisType={'percentage'}
                nodeName={nodeName}
                instanceIP={instanceIP}
                showAvg={showAvg}
                getMetricQuery={getCPUUsageQuery}
                getMetricAvgQuery={getCPUUsageAvgQuery}
              ></MetricChart>

              <MetricChart
                title={'CPU System Load'}
                yAxisType={'default'}
                nodeName={nodeName}
                instanceIP={instanceIP}
                showAvg={showAvg}
                getMetricQuery={getSystemLoadQuery}
                getMetricAvgQuery={getSystemLoadAvgQuery}
              ></MetricChart>

              <MetricChart
                title={'Memory'}
                yAxisType={'percentage'}
                nodeName={nodeName}
                instanceIP={instanceIP}
                showAvg={showAvg}
                getMetricQuery={getMemoryQuery}
                getMetricAvgQuery={getMemoryAvgQuery}
              ></MetricChart>

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
            </GraphGrid>
            <ChartLegend shape="line" legendSize="Smaller" />
          </ChartContainer>
        </ChartLegendWrapper>
      ) : (
        <RenderNoDataAvailable />
      )}
    </>
  );
};

export default NodePageMetricsTab;
