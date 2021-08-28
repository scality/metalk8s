//@flow
import React from 'react';
import styled from 'styled-components';
import { useQuery, UseQueryOptions } from 'react-query';
import { Button, SyncedCursorCharts } from '@scality/core-ui/dist/next';
import { padding } from '@scality/core-ui/dist/style/theme';
import { lighten, darken } from 'polished';
import { useIntl } from 'react-intl';

import { fetchConfig } from '../services/api';
import {
  lineColor1,
  lineColor2,
  lineColor3,
  lineColor4,
  REFRESH_METRICS_GRAPH,
  GRAFANA_DASHBOARDS,
} from '../constants';
import {
  GraphTitle as GraphTitleCommon,
  GraphWrapper as GraphWrapperCommon,
  PageSubtitle,
} from '../components/style/CommonLayoutStyle';
import { expressionFunction } from 'vega';
import DashboardChartCpuUsage from './DashboardChartCpuUsage';
import DashboardChartSystemLoad from './DashboardChartSystemLoad';
import DashboardChartThroughput from './DashboardChartThroughput';
import DashboardChartMemory from './DashboardChartMemory';

// Custom formatter to display negative value as an absolute value in throughput chart
expressionFunction('throughputFormatter', function (datum) {
  return Math.abs(datum).toFixed(2);
});

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

export const GraphTitle = styled(GraphTitleCommon)`
  padding-top: 0px;
  padding-left: ${padding.small};
  background-color: yellow;
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

// We use 4 main color from the palette and decline them (lighter/ darker) when we have more than 4 datasets
export const colorRange = [
  lineColor1,
  lineColor2,
  lineColor3,
  lineColor4,
  lighten(0.3, lineColor1),
  lighten(0.3, lineColor2),
  lighten(0.3, lineColor3),
  lighten(0.3, lineColor4),
  darken(0.2, lineColor1),
  darken(0.2, lineColor2),
  darken(0.2, lineColor3),
  darken(0.2, lineColor4),
];

const DashboardMetrics = () => {
  const intl = useIntl();

  // App config, used to generated Advanced metrics button link
  const configQuery = useQuery('appConfig', fetchConfig);

  const reactQueryOptions: UseQueryOptions = {
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchInterval: REFRESH_METRICS_GRAPH,
    refetchIntervalInBackground: true,
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
