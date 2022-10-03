import React from 'react';
import styled from 'styled-components';
import { useIntl } from 'react-intl';
import { spacing } from '@scality/core-ui/dist/style/theme';
import {
  PageSubtitle,
  GraphsWrapper,
} from '../components/style/CommonLayoutStyle';
import DashboardPlaneHealth from './DashboardPlaneHealth';
import DashboardBandwidthChart from './DashboardBandwidthChart';
import { DashboardScrollableArea } from '../containers/DashboardPage';
import { SpacedBox } from '@scality/core-ui';
import { useShowQuantileChart } from '../hooks';
import { Tooltip, Icon, SmallerText } from '@scality/core-ui';

export const NetworkContainer = styled.div`
  padding: ${spacing.sp2} ${spacing.sp4};
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  max-width: 100%;
`;

export const PanelActions = styled.div`
  display: flex;
  padding: ${spacing.sp4};
  align-items: center;
  justify-content: space-between;
`;

const DashboardNetwork = () => {
  const intl = useIntl();
  const { isShowQuantileChart } = useShowQuantileChart();

  return (
    <NetworkContainer>
      <PanelActions>
        <PageSubtitle>
          <SpacedBox mr={8}> {intl.formatMessage({ id: 'network' })}</SpacedBox>
          {isShowQuantileChart && (
            <Tooltip
              placement="bottom"
              overlay={
                <SmallerText
                  style={{
                    minWidth: '30rem',
                    display: 'block',
                    textAlign: 'left',
                  }}
                >
                  {intl
                    .formatMessage({
                      id: 'network_quantile_explanation',
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
              <Icon name="Question-circle" color="buttonSecondary" />
            </Tooltip>
          )}
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
