import { Icon, IconHelp, SmallerText, Stack, spacing } from '@scality/core-ui';
import { Box, Button, ChartLegend, ChartLegendWrapper } from '@scality/core-ui/dist/next';
import React from 'react';
import { useIntl } from 'react-intl';
import { GraphsWrapper, PageSubtitle } from '../components/style/CommonLayoutStyle';
import { GRAFANA_DASHBOARDS } from '../constants';
import { DashboardScrollableArea } from '../containers/DashboardPage';
import { useShowQuantileChart, useTypedSelector } from '../hooks';
import { createColorSet } from '../services/graphUtils';
import DashboardChartCpuUsage from './DashboardChartCpuUsage';
import DashboardChartMemory from './DashboardChartMemory';
import DashboardChartSystemLoad from './DashboardChartSystemLoad';
import DashboardChartThroughput from './DashboardChartThroughput';
import { DashboardSectionContainer, PanelActions } from './DashboardNetwork';

export const QuantileHelpTooltip = () => {
  const intl = useIntl();
  return (
    <IconHelp
      placement="bottom"
      tooltipMessage={
        <Stack direction="vertical" gap="r8">
          {intl
            .formatMessage({
              id: 'metric_quantile_explanation',
            })
            .split('\n')
            .map((line, key) => (
              <SmallerText key={`globalheathexplanation-${key}`}>{line}</SmallerText>
            ))}
        </Stack>
      }
    />
  );
};

const DashboardMetrics = () => {
  const intl = useIntl();
  // App config, used to generated Advanced metrics button link
  const { url_grafana } = useTypedSelector((state) => state.config.api);
  const { isShowQuantileChart } = useShowQuantileChart();

  return (
    <DashboardSectionContainer id="dashboard-metrics-container">
      <PanelActions>
        <PageSubtitle>
          <Box mr={spacing.r8}>
            {intl.formatMessage({
              id: 'metrics',
            })}
          </Box>
          {isShowQuantileChart && <QuantileHelpTooltip />}
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
          <ChartLegendWrapper colorSet={createColorSet}>
            <DashboardChartCpuUsage />
            <DashboardChartMemory />
            <DashboardChartSystemLoad />
            <DashboardChartThroughput />
            <ChartLegend shape="line" legendSize={'Smaller'} />
          </ChartLegendWrapper>
        </GraphsWrapper>
      </DashboardScrollableArea>
    </DashboardSectionContainer>
  );
};

export default DashboardMetrics;
