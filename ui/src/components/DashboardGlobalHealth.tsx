import styled from 'styled-components';
import DashboardAlerts from './DashboardAlerts';
import { Box, useMetricsTimeSpan } from '@scality/core-ui/dist/next';
import {
  EmphaseText,
  LargerText,
  SmallerText,
  Tooltip,
  StatusWrapper,
  Loader,
  AppContainer,
  spacing,
  Stack,
  Icon,
} from '@scality/core-ui';
import { GlobalHealthBar as GlobalHealthBarRecharts } from '@scality/core-ui/dist/components/globalhealthbar/GlobalHealthBarRecharts.component';
import {
  highestAlertToStatus,
  useAlertLibrary,
  useHighestSeverityAlerts,
} from '../containers/AlertProvider';
import { useIntl } from 'react-intl';
import { useStartingTimeStamp } from '../containers/StartTimeProvider';
import CircleStatus from './CircleStatus';
import StatusIcon from './StatusIcon';
import { getClusterAlertSegmentQuery } from '../services/platformlibrary/metrics';

import { useQuery } from 'react-query';

const HealthBarContainer = styled.div`
  flex-direction: column;
  width: 90%;
  margin: 0 auto;
`;
const PlatformStatusIcon = styled.div`
  margin: 0 1rem;
  font-size: 2rem;
`;

const StyledEmphaseText = styled(EmphaseText)`
  letter-spacing: ${spacing.r2};
`;

const DashboardGlobalHealth = () => {
  const intl = useIntl();
  const { startingTimeISO, currentTimeISO } = useStartingTimeStamp();
  const alertsLibrary = useAlertLibrary();
  const { duration } = useMetricsTimeSpan();
  const { data: alerts, status: historyAlertStatus } = useQuery(
    getClusterAlertSegmentQuery(duration),
  );
  const platformHighestSeverityAlert = useHighestSeverityAlerts(
    alertsLibrary.getPlatformAlertSelectors(),
  );
  const platformStatus = highestAlertToStatus(platformHighestSeverityAlert);
  return (
    <AppContainer.OverallSummary>
      <Stack style={{ alignItems: 'center' }}>
        <Box flex="1" display="flex">
          <PlatformStatusIcon>
            <StatusWrapper status={platformStatus}>
              <StatusIcon status={platformStatus} name="Datacenter" />
            </StatusWrapper>
          </PlatformStatusIcon>

          <LargerText>
            {intl.formatMessage({
              id: 'platform',
            })}
          </LargerText>
        </Box>
        <Box flex="2">
          <HealthBarContainer>
            <Stack
              style={{
                display: 'flex',
                alignItems: 'center',
              }}
              gap="r20"
            >
              <StyledEmphaseText>Global Health</StyledEmphaseText>

              <Tooltip
                placement="bottom"
                overlay={
                  <SmallerText>
                    {intl
                      .formatMessage({
                        id: 'global_health_explanation',
                      })
                      .split('\n')
                      .map((line, key) => (
                        <Box key={`globalheathexplanation-${key}`} mb={8}>
                          {line}
                        </Box>
                      ))}
                  </SmallerText>
                }
                overlayStyle={{
                  minWidth: '30rem',
                  display: 'block',
                }}
              >
                <Icon name="Info" color="buttonSecondary" />
              </Tooltip>
              <CircleStatus status={platformStatus} />
            </Stack>

            {historyAlertStatus === 'loading' && (
              <Box ml={8}>
                <Loader size={'larger'} />
              </Box>
            )}

            <GlobalHealthBarRecharts
              id={'platform_globalhealth'}
              alerts={alerts || []}
              start={new Date(startingTimeISO)}
              end={new Date(currentTimeISO)}
            />
          </HealthBarContainer>
        </Box>
        <Box flex="2" ml={24}>
          <DashboardAlerts />
        </Box>
      </Stack>
    </AppContainer.OverallSummary>
  );
};

export default DashboardGlobalHealth;
