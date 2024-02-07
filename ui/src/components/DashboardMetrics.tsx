import React from 'react';
import styled from 'styled-components';
import { Button } from '@scality/core-ui/dist/next';
import { padding } from '@scality/core-ui/dist/style/theme';
import { useIntl } from 'react-intl';
import { GRAFANA_DASHBOARDS } from '../constants';
import {
  PageSubtitle,
  GraphsWrapper,
} from '../components/style/CommonLayoutStyle';
import DashboardChartCpuUsage from './DashboardChartCpuUsage';
import DashboardChartThroughput from './DashboardChartThroughput';
import DashboardChartSystemLoad from './DashboardChartSystemLoad';
import DashboardChartMemory from './DashboardChartMemory';
import { useShowQuantileChart, useTypedSelector } from '../hooks';
import { DashboardScrollableArea } from '../containers/DashboardPage';
import { Tooltip, Icon, SmallerText, SpacedBox } from '@scality/core-ui';
const MetricsContainer = styled.div`
  padding: 2px ${padding.smaller};
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  max-height: 100%;
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
  const { url_grafana } = useTypedSelector((state) => state.config.api);
  const { isShowQuantileChart } = useShowQuantileChart();
  return (
    <MetricsContainer id="dashboard-metrics-container">
      <PanelActions>
        <PageSubtitle>
          <SpacedBox mr={8}>
            {' '}
            {intl.formatMessage({
              id: 'metrics',
            })}
          </SpacedBox>
          {isShowQuantileChart && (
            <Tooltip
              placement="bottom"
              overlay={
                <SmallerText
                  // @ts-expect-error - FIXME when you are working on it
                  style={{
                    minWidth: '30rem',
                    display: 'block',
                    textAlign: 'left',
                  }}
                >
                  {intl
                    .formatMessage({
                      id: 'metric_quantile_explanation',
                    })
                    .split('\n')
                    .map((line, key) => (
                      <SpacedBox key={`globalheathexplanation-${key}`} mb={8}>
                        {line}
                      </SpacedBox>
                    ))}
                </SmallerText>
              }
            >
              <Icon name="Info" color="buttonSecondary" />
            </Tooltip>
          )}
        </PageSubtitle>

        {url_grafana && (
          <a
            href={`${url_grafana}/d/${GRAFANA_DASHBOARDS.nodes}`}
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
            />
          </a>
        )}
      </PanelActions>
      <DashboardScrollableArea>
        <GraphsWrapper>
          <DashboardChartCpuUsage />
          <DashboardChartMemory />
          <DashboardChartSystemLoad />
          <DashboardChartThroughput />
        </GraphsWrapper>
      </DashboardScrollableArea>
    </MetricsContainer>
  );
};

export default DashboardMetrics;
