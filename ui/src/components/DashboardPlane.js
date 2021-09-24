import React from 'react';
import { useIntl } from 'react-intl';
import styled from 'styled-components';
import { spacing } from '@scality/core-ui/dist/style/theme';
import {
  useAlertLibrary,
  useHighestSeverityAlerts,
  highestAlertToStatus,
} from '../containers/AlertProvider';
import { PageSubtitle } from './style/CommonLayoutStyle';
import { PanelActions, NetworkContainer } from './DashboardNetwork';
import HealthItem from './HealthItem.js';
import DashboardBandwidthChart from './DashboardBandwidthChart';

const PlanesContainer = styled.div`
  padding-left: ${spacing.sp8};
  display: flex;
  flex-direction: row;
`;

const PlaneContainer = styled.div`
  display: flex;
  flex-direction: row;
  margin-right: ${spacing.sp40};
`;

const ChartContainer = styled.div`
  margin-top: ${spacing.sp24};
`;

const DashboardPlane = () => {
  const intl = useIntl();
  const alertsLibrary = useAlertLibrary();

  const planesHighestSecurityAlert = useHighestSeverityAlerts(
    alertsLibrary.getNetworksAlertSelectors(),
  );
  const planesStatus = highestAlertToStatus(planesHighestSecurityAlert);

  return (
    <NetworkContainer>
      <PanelActions>
        <PageSubtitle>Planes</PageSubtitle>
      </PanelActions>
      <PlanesContainer>
        <PlaneContainer>
          <HealthItem
            label={intl.formatMessage({ id: 'control_plane' })}
            status={planesStatus}
            alerts={planesHighestSecurityAlert}
            showArrow={false}
          />
        </PlaneContainer>
        <PlaneContainer>
          <HealthItem
            label={intl.formatMessage({ id: 'workload_plane' })}
            status={planesStatus}
            alerts={planesHighestSecurityAlert}
            showArrow={false}
          />
        </PlaneContainer>
      </PlanesContainer>
      <ChartContainer>
        <DashboardBandwidthChart
          title="ControlPlane Bandwidth"
          plane="controlPlane"
        ></DashboardBandwidthChart>
        <DashboardBandwidthChart
          title="WorkloadPlane Bandwidth"
          plane="workloadPlane"
        ></DashboardBandwidthChart>
      </ChartContainer>
    </NetworkContainer>
  );
};

export default DashboardPlane;
