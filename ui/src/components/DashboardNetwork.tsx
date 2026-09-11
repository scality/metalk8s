import React from 'react';
import styled from 'styled-components';
import { useIntl } from 'react-intl';
import { PageSubtitle } from '../components/style/CommonLayoutStyle';
import DashboardPlaneHealth from './DashboardPlaneHealth';
import DashboardBandwidthChart from './DashboardBandwidthChart';
import { DashboardScrollableArea } from '../containers/DashboardPage';
import { useShowQuantileChart } from '../hooks';
import { QuantileHelpTooltip } from './DashboardMetrics';
import { Box } from '@scality/core-ui/dist/next';
import { spacing, Stack } from '@scality/core-ui';
export const DashboardSectionContainer = styled.div`
  padding: ${spacing.r2} ${spacing.r4};
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  max-width: 100%;
  max-height: 100%;
  gap: ${spacing.r16};
  padding-bottom: ${spacing.r16};

  /* Stacked, the two panels share whatever height the inventory leaves, so the
     desktop breathing room between the title and the charts is height taken
     straight out of the charts. */
  @container responsive (max-width: 700px) {
    gap: ${spacing.r8};
    padding-bottom: ${spacing.r4};
  }
`;
export const PanelActions = styled.div`
  display: flex;
  padding: ${spacing.r4};
  padding-bottom: ${spacing.r16};
  align-items: center;
  justify-content: space-between;

  @container responsive (max-width: 700px) {
    padding-bottom: ${spacing.r4};
  }
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
