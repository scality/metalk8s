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
import { GlobalHealthBar } from '@scality/core-ui/dist/components/globalhealthbar/GlobalHealthBar.component';

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

const DashboardGlobalHealth = () => {
  const intl = useIntl();
  const { startingTimeISO, currentTimeISO } = useStartingTimeStamp();
  const alertsLibrary = useAlertLibrary();
  const { duration } = useMetricsTimeSpan();
  const { data: alertSegments, status: historyAlertStatus } = useQuery(
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
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Box
                style={{
                  display: 'flex',
                  alignItems: 'center',
                }}
                mr={20}
              >
                <Box
                  mr={8}
                  style={{
                    letterSpacing: spacing.r2,
                  }}
                >
                  <EmphaseText>Global Health</EmphaseText>
                </Box>

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
              </Box>
              <EmphaseText>
                <CircleStatus status={platformStatus} />
              </EmphaseText>
              {historyAlertStatus === 'loading' && (
                <Box ml={8}>
                  <Loader size={'larger'} />
                </Box>
              )}
            </div>
            <Box mr={20}>
              <GlobalHealthBar
                id={'platform_globalhealth'}
                alerts={
                  historyAlertStatus === 'error'
                    ? [
                        {
                          startsAt: startingTimeISO,
                          endsAt: currentTimeISO,
                          severity: 'unavailable',
                          description:
                            'Failed to load alert history for the selected period',
                        },
                      ]
                    : alertSegments || []
                }
                start={startingTimeISO}
                end={currentTimeISO}
              />
            </Box>
          </HealthBarContainer>
        </Box>
        <Box flex="2">
          <Box ml={24}>
            <DashboardAlerts />
          </Box>
        </Box>
      </Stack>
    </AppContainer.OverallSummary>
  );
};

export default DashboardGlobalHealth;
