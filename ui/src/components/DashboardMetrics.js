//@flow
import React from 'react';
import styled from 'styled-components';
import { useQuery, UseQueryOptions } from 'react-query';
import { Button, SyncedCursorCharts } from '@scality/core-ui/dist/next';
import { padding } from '@scality/core-ui/dist/style/theme';
import { useIntl } from 'react-intl';

import { fetchConfig } from '../services/api';
import { GRAFANA_DASHBOARDS } from '../constants';
import {
  GraphWrapper as GraphWrapperCommon,
  PageSubtitle,
} from '../components/style/CommonLayoutStyle';

import DashboardChartCpuUsage from './DashboardChartCpuUsage';
import DashboardChartSystemLoad from './DashboardChartSystemLoad';
import DashboardChartThroughput from './DashboardChartThroughput';
import DashboardChartMemory from './DashboardChartMemory';

const MetricsContainer = styled.div`
  padding: 2px ${padding.smaller};
  display: flex;
  flex-direction: column;
  flex-grow: 1;
`;

export const GraphWrapper = styled(GraphWrapperCommon)`
  position: relative;
  min-height: 90px;
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

  // App config, used to generated Advanced metrics button link
  const configQuery = useQuery('appConfig', fetchConfig);

  const reactQueryOptions: UseQueryOptions = {
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  };

  return (
    <MetricsContainer id="dashboard-metrics-container">
      <PanelActions>
        <PageSubtitle>{intl.formatMessage({ id: 'metrics' })}</PageSubtitle>
        {configQuery.isSuccess && configQuery.data.url_grafana && (
          <a
            href={`${configQuery.data.url_grafana}/d/${GRAFANA_DASHBOARDS.nodes}`}
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
      <GraphsWrapper>
        <SyncedCursorCharts>
          <DashboardChartCpuUsage reactQueryOptions={reactQueryOptions} />
          <DashboardChartMemory reactQueryOptions={reactQueryOptions} />
          <DashboardChartSystemLoad reactQueryOptions={reactQueryOptions} />
          <DashboardChartThroughput reactQueryOptions={reactQueryOptions} />
        </SyncedCursorCharts>
      </GraphsWrapper>
    </MetricsContainer>
  );
};

export default DashboardMetrics;
