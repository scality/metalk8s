import {
  AppContainer,
  EmphaseText,
  IconHelp,
  LargerText,
  Loader,
  SmallerText,
  Stack,
  StatusWrapper,
  spacing,
} from '@scality/core-ui';
import {
  type Alert,
  Box,
  GlobalHealthBar as GlobalHealthBarRecharts,
  useMetricsTimeSpan,
} from '@scality/core-ui/dist/next';
import { useIntl } from 'react-intl';
import { useQuery } from 'react-query';
import styled from 'styled-components';
import { highestAlertToStatus, useAlertLibrary, useHighestSeverityAlerts } from '../containers/AlertProvider';
import { useStartingTimeStamp } from '../containers/StartTimeProvider';
import { getClusterAlertSegmentQuery } from '../services/platformlibrary/metrics';
import CircleStatus from './CircleStatus';
import DashboardAlerts from './DashboardAlerts';
import StatusIcon from './StatusIcon';

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
  const { data: alerts, status: historyAlertStatus } = useQuery(getClusterAlertSegmentQuery(duration));
  const platformHighestSeverityAlert = useHighestSeverityAlerts(alertsLibrary.getPlatformAlertSelectors());
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

              <IconHelp
                placement="bottom"
                tooltipMessage={
                  <Stack direction="vertical" gap="r4">
                    {intl
                      .formatMessage({
                        id: 'global_health_explanation',
                      })
                      .split('\n')
                      .map((line, key) => (
                        <SmallerText key={`globalheathexplanation-${key}`}>{line}</SmallerText>
                      ))}
                  </Stack>
                }
              />
              <CircleStatus status={platformStatus} />
            </Stack>

            {historyAlertStatus === 'loading' ? (
              <Box ml={8} height={50}>
                <Loader size={'larger'} />
              </Box>
            ) : (
              <GlobalHealthBarRecharts
                id={'platform_globalhealth'}
                alerts={
                  historyAlertStatus === 'error'
                    ? ([
                        {
                          startsAt: startingTimeISO,
                          endsAt: currentTimeISO,
                          severity: 'unavailable',
                          description: 'Failed to load alert history for the selected period',
                        },
                      ] as Alert[])
                    : alerts || []
                }
                start={new Date(startingTimeISO)}
                end={new Date(currentTimeISO)}
              />
            )}
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
