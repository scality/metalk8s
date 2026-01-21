import { Stack, spacing } from '@scality/core-ui';
import React from 'react';
import { useIntl } from 'react-intl';
import { highestAlertToStatus, useAlertLibrary, useHighestSeverityAlerts } from '../containers/AlertProvider';
import HealthItem from './HealthItem';

const DashboardPlaneHealth = () => {
  const intl = useIntl();
  const alertsLibrary = useAlertLibrary();
  const planesHighestSecurityAlert = useHighestSeverityAlerts(alertsLibrary.getNetworksAlertSelectors());
  const planesStatus = highestAlertToStatus(planesHighestSecurityAlert);
  return (
    <Stack gap="r40" style={{ paddingInline: spacing.r4 }}>
      <HealthItem
        label={intl.formatMessage({
          id: 'control_plane',
        })}
        status={planesStatus}
        alerts={planesHighestSecurityAlert}
        showArrow={false}
      />
      <HealthItem
        label={intl.formatMessage({
          id: 'workload_plane',
        })}
        status={planesStatus}
        alerts={planesHighestSecurityAlert}
        showArrow={false}
      />
    </Stack>
  );
};

export default DashboardPlaneHealth;
