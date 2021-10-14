import React from 'react';
import { useIntl } from 'react-intl';
import styled from 'styled-components';
import { spacing } from '@scality/core-ui/dist/style/theme';
import {
  useAlertLibrary,
  useHighestSeverityAlerts,
  highestAlertToStatus,
} from '../containers/AlertProvider';
import { NetworkContainer } from './DashboardNetwork';
import HealthItem from './HealthItem.js';

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

const DashboardPlaneHealth = () => {
  const intl = useIntl();
  const alertsLibrary = useAlertLibrary();

  const planesHighestSecurityAlert = useHighestSeverityAlerts(
    alertsLibrary.getNetworksAlertSelectors(),
  );
  const planesStatus = highestAlertToStatus(planesHighestSecurityAlert);

  return (
    <NetworkContainer>
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
    </NetworkContainer>
  );
};

export default DashboardPlaneHealth;
