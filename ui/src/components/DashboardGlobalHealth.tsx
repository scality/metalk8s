import styled from 'styled-components';
import { AppContainer, LargerText, Stack, StatusWrapper } from '@scality/core-ui';
import { Box } from '@scality/core-ui/dist/next';
import { highestAlertToStatus, useAlertLibrary, useHighestSeverityAlerts } from '../containers/AlertProvider';
import { useIntl } from 'react-intl';
import DashboardAlerts from './DashboardAlerts';
import PlatformGlobalHealthBar from './PlatformGlobalHealthBar';
import StatusIcon from './StatusIcon';

const PlatformStatusIcon = styled.div`
  margin: 0 1rem;
  font-size: 2rem;
`;

const DashboardGlobalHealth = () => {
  const intl = useIntl();
  const alertsLibrary = useAlertLibrary();
  const platformHighestSeverityAlert = useHighestSeverityAlerts(alertsLibrary.getPlatformAlertSelectors());
  const platformStatus = highestAlertToStatus(platformHighestSeverityAlert);

  return (
    <AppContainer.OverallSummary>
      <Stack style={{ alignItems: 'center' }}>
        <Box flex="1" display="flex">
          <PlatformStatusIcon>
            <StatusWrapper status={platformStatus}>
              <StatusIcon status={platformStatus} name="Datacenter" entity="Platform" />
            </StatusWrapper>
          </PlatformStatusIcon>
          <LargerText>
            {intl.formatMessage({
              id: 'platform',
            })}
          </LargerText>
        </Box>
        <Box flex="2">
          <PlatformGlobalHealthBar />
        </Box>
        <Box flex="2" ml={24}>
          <DashboardAlerts />
        </Box>
      </Stack>
    </AppContainer.OverallSummary>
  );
};

export default DashboardGlobalHealth;
