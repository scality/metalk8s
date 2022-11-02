import React from 'react';
import styled from 'styled-components';
import { spacing } from '@scality/core-ui/dist/style/theme';
import DashboardAlerts from './DashboardAlerts';
import { Box, useMetricsTimeSpan } from '@scality/core-ui/dist/next';
import {
  EmphaseText,
  LargerText,
  SmallerText,
  Tooltip,
  StatusWrapper,
  Loader,
  SpacedBox,
  AppContainer,
  Stack,
} from '@scality/core-ui';
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
import { GlobalHealthBar } from '@scality/core-ui/dist/components/globalhealthbar/GlobalHealthBar.component';
import { Icon } from '@scality/core-ui/dist/components/icon/Icon.component';
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
      <Stack alignItems="center">
        <Box flex="1" display="flex">
          <PlatformStatusIcon>
            <StatusWrapper status={platformStatus}>
              <StatusIcon status={platformStatus} name="Datacenter" />
            </StatusWrapper>
          </PlatformStatusIcon>

          <LargerText>{intl.formatMessage({ id: 'platform' })}</LargerText>
        </Box>
        <Box flex="2">
          <HealthBarContainer>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <SpacedBox
                style={{ display: 'flex', alignItems: 'center' }}
                mr={20}
              >
                <SpacedBox mr={8}>
                  <EmphaseText style={{ letterSpacing: spacing.sp2 }}>
                    Global Health
                  </EmphaseText>
                </SpacedBox>

                <Tooltip
                  placement="bottom"
                  overlay={
                    <SmallerText
                      style={{ minWidth: '30rem', display: 'block' }}
                    >
                      {intl
                        .formatMessage({
                          id: 'global_health_explanation',
                        })
                        .split('\n')
                        .map((line, key) => (
                          <SpacedBox
                            key={`globalheathexplanation-${key}`}
                            mb={8}
                          >
                            {line}
                          </SpacedBox>
                        ))}
                    </SmallerText>
                  }
                >
                  <Icon name="Info" color="buttonSecondary" />
                </Tooltip>
              </SpacedBox>
              <EmphaseText>
                <CircleStatus status={platformStatus} />
              </EmphaseText>
              {historyAlertStatus === 'loading' && (
                <SpacedBox ml={8}>
                  <Loader size={'larger'} />
                </SpacedBox>
              )}
            </div>
            <SpacedBox mr={20}>
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
            </SpacedBox>
          </HealthBarContainer>
        </Box>
        <Box flex="2">
          <SpacedBox ml={24}>
            <DashboardAlerts />
          </SpacedBox>
        </Box>
      </Stack>
    </AppContainer.OverallSummary>
  );
};

export default DashboardGlobalHealth;
