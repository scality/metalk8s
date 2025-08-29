import React from 'react';
import styled from 'styled-components';
import { useIntl } from 'react-intl';
import {
  PageSubtitle,
  GraphsWrapper,
} from '../components/style/CommonLayoutStyle';
import DashboardPlaneHealth from './DashboardPlaneHealth';
import DashboardBandwidthChart from './DashboardBandwidthChart';
import { DashboardScrollableArea } from '../containers/DashboardPage';
import { useShowQuantileChart } from '../hooks';
import { QuantileHelpTooltip } from './DashboardMetrics';
import { Box } from '@scality/core-ui/dist/next';
import { spacing } from '@scality/core-ui';
export const NetworkContainer = styled.div`
  padding: ${spacing.r2} ${spacing.r4};
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  max-width: 100%;
`;
export const PanelActions = styled.div`
  display: flex;
  padding: ${spacing.r4};
  align-items: center;
  justify-content: space-between;
`;

const DashboardNetwork = () => {
  const intl = useIntl();
  const { isShowQuantileChart } = useShowQuantileChart();
  return (
    <NetworkContainer
      style={{
        height: 'fit-content',
      }}
    >
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
        <GraphsWrapper>
          <DashboardBandwidthChart
            title="ControlPlane Bandwidth"
            plane="controlPlane"
          />
          <DashboardBandwidthChart
            title="WorkloadPlane Bandwidth"
            plane="workloadPlane"
          />
        </GraphsWrapper>
      </DashboardScrollableArea>
    </NetworkContainer>
  );
};

export default DashboardNetwork;
