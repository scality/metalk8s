//@flow
import React from 'react';
import styled from 'styled-components';
import { Button } from '@scality/core-ui/dist/next';
import { padding } from '@scality/core-ui/dist/style/theme';
import { useIntl } from 'react-intl';

import { GRAFANA_DASHBOARDS, NODES_LIMIT_QUANTILE } from '../constants';
import {
  GraphWrapper as GraphWrapperCommon,
  PageSubtitle,
} from '../components/style/CommonLayoutStyle';

import DashboardChartCpuUsage from './DashboardChartCpuUsage';
import DashboardChartThroughput from './DashboardChartThroughput';
import DashboardChartSystemLoad from './DashboardChartSystemLoad';
import DashboardChartMemory from './DashboardChartMemory';
import { useNodes, useTypedSelector } from '../hooks';
import { DashboardScrollableArea } from '../containers/DashboardPage';

const MetricsContainer = styled.div`
  padding: 2px ${padding.smaller};
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  max-height: 100%;
`;

export const GraphWrapper = styled(GraphWrapperCommon)`
  position: relative;
  padding: 2px 0px;

  .sc-loader {
    background: none;
  }
`;

const GraphsWrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  flex-grow: 1;
`;

const PanelActions = styled.div`
  display: flex;
  padding: ${padding.small};
  align-items: center;
  justify-content: space-between;
`;

const DashboardMetrics = () => {
  const intl = useIntl();
  const nodes = useNodes();
  // App config, used to generated Advanced metrics button link
  const { url_grafana, flags } = useTypedSelector((state) => state.config.api);
  const isShowQuantileChart =
    (flags && flags.includes('force_quantile_chart')) ||
    nodes?.length > NODES_LIMIT_QUANTILE;

  return (
    <MetricsContainer id="dashboard-metrics-container">
      <PanelActions>
        <PageSubtitle>{intl.formatMessage({ id: 'metrics' })}</PageSubtitle>
        {url_grafana && (
          <a
            href={`${url_grafana}/d/${GRAFANA_DASHBOARDS.nodes}`}
            target="_blank"
            rel="noopener noreferrer"
            data-cy="advanced_metrics_node_detailed"
          >
            <Button
              label={intl.formatMessage({ id: 'advanced_metrics' })}
              variant={'secondary'}
              icon={<i className="fas fa-external-link-alt" />}
            />
          </a>
        )}
      </PanelActions>
      <DashboardScrollableArea>
        <GraphsWrapper>
          <DashboardChartCpuUsage isShowQuantileChart={isShowQuantileChart} />
          <DashboardChartMemory isShowQuantileChart={isShowQuantileChart} />
          <DashboardChartSystemLoad isShowQuantileChart={isShowQuantileChart} />
          <DashboardChartThroughput isShowQuantileChart={isShowQuantileChart} />
        </GraphsWrapper>
      </DashboardScrollableArea>
    </MetricsContainer>
  );
};

export default DashboardMetrics;
