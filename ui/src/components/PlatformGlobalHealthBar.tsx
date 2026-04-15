import { IconHelp, Loader, SmallerText, Stack, Text } from '@scality/core-ui';
import { Alert, Box, GlobalHealthBar as GlobalHealthBarRecharts, useMetricsTimeSpan } from '@scality/core-ui/dist/next';
import { useIntl } from 'react-intl';
import { useQuery } from 'react-query';
import styled from 'styled-components';
import { highestAlertToStatus, useAlertLibrary, useHighestSeverityAlerts } from '../containers/AlertProvider';
import { useStartingTimeStamp } from '../containers/StartTimeProvider';
import { getClusterAlertSegmentQuery } from '../services/platformlibrary/metrics';
import CircleStatus from './CircleStatus';

const HealthBarContainer = styled.div`
  display: flex;
  flex-direction: column;
`;

const PlatformGlobalHealthBar = ({ title = 'Global Health' }: { title?: string }) => {
  const intl = useIntl();
  const { startingTimeISO, currentTimeISO } = useStartingTimeStamp();
  const alertsLibrary = useAlertLibrary();
  const { duration } = useMetricsTimeSpan();
  const { data: alerts, status: historyAlertStatus } = useQuery({
    ...getClusterAlertSegmentQuery(duration),
    keepPreviousData: true,
  });
  const platformHighestSeverityAlert = useHighestSeverityAlerts(alertsLibrary.getPlatformAlertSelectors());
  const platformStatus = highestAlertToStatus(platformHighestSeverityAlert);

  return (
    <HealthBarContainer>
      <Stack
        style={{
          display: 'flex',
          alignItems: 'center',
        }}
        gap="r8"
      >
        <CircleStatus status={platformStatus} />
        <Text isEmphazed>{title}</Text>
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
  );
};

export default PlatformGlobalHealthBar;
