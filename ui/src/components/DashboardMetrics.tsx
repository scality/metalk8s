import React from 'react';
import { Box, ChartLegend, ChartLegendWrapper } from '@scality/core-ui/dist/next';

import { useIntl } from 'react-intl';
import { createColorSet } from '../services/graphUtils';
import { PageSubtitle, GraphsWrapper } from '../components/style/CommonLayoutStyle';
import DashboardChartCpuUsage from './DashboardChartCpuUsage';
import DashboardChartThroughput from './DashboardChartThroughput';
import DashboardChartSystemLoad from './DashboardChartSystemLoad';
import DashboardChartMemory from './DashboardChartMemory';
import { useShowQuantileChart } from '../hooks';
import { DashboardScrollableArea } from '../containers/DashboardPage';
import { SmallerText, Stack, IconHelp, spacing } from '@scality/core-ui';
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
