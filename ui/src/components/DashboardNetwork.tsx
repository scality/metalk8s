import { Stack, spacing } from '@scality/core-ui';
import { Box } from '@scality/core-ui/dist/next';
import React from 'react';
import { useIntl } from 'react-intl';
import styled from 'styled-components';
import { PageSubtitle } from '../components/style/CommonLayoutStyle';
import { DashboardScrollableArea } from '../containers/DashboardPage';
import { useShowQuantileChart } from '../hooks';
import DashboardBandwidthChart from './DashboardBandwidthChart';
import { QuantileHelpTooltip } from './DashboardMetrics';
import DashboardPlaneHealth from './DashboardPlaneHealth';
export const DashboardSectionContainer = styled.div`
  padding: ${spacing.r2} ${spacing.r4};
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  max-width: 100%;
  max-height: 100%;
  gap: ${spacing.r16};
  padding-bottom: ${spacing.r16};
`;
export const PanelActions = styled.div`
  display: flex;
  padding: ${spacing.r4};
  padding-bottom: ${spacing.r16};
  align-items: center;
  justify-content: space-between;
`;

const DashboardNetwork = () => {
  const intl = useIntl();
  const { isShowQuantileChart } = useShowQuantileChart();
  return (
    <DashboardSectionContainer>
      <PanelActions>
        <PageSubtitle>
          <Box mr={spacing.r8}>
            {intl.formatMessage({
              id: 'network',
            })}
          </Box>
          {isShowQuantileChart && <QuantileHelpTooltip />}
        </PageSubtitle>
      </PanelActions>

      <DashboardPlaneHealth />
      <DashboardScrollableArea>
        <Stack direction="vertical" gap="r16" style={{ paddingInline: spacing.r8 }}>
          <DashboardBandwidthChart title="ControlPlane Bandwidth" plane="controlPlane" />
          <DashboardBandwidthChart title="WorkloadPlane Bandwidth" plane="workloadPlane" />
        </Stack>
      </DashboardScrollableArea>
    </DashboardSectionContainer>
  );
};

export default DashboardNetwork;
