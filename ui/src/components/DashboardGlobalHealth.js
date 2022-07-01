import React from 'react';
import styled, { useTheme } from 'styled-components';
import { spacing } from '@scality/core-ui/dist/style/theme';
import DashboardAlerts from './DashboardAlerts';
import { useMetricsTimeSpan } from '@scality/core-ui/dist/next';
import {
  EmphaseText,
  LargerText,
  SmallerText,
  Tooltip,
  StatusWrapper,
  Loader,
  SpacedBox,
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
import GlobalHealthBar from '@scality/core-ui/dist/components/globalhealthbar/GlobalHealthBar.component';
import { useQuery } from 'react-query';

const GlobalHealthContainer = styled.div`
  display: flex;
  align-items: center;
  height: 100%;
  .datacenter {
    flex: 1 0 20%;
  }
  .healthbar {
    flex: 1 0 40%;
    max-width: 40%;
  }
  .alerts {
    flex: 1 0 40%;
  }
  & > div {
    display: flex;
    &:not(:first-of-type):before {
      content: '';
      position: relative;
      margin: auto 0;
      width: ${spacing.sp2};
      height: 75px;
      background-color: ${(props) => props.theme.backgroundLevel1};
    }
  }
`;

const HealthBarContainer = styled.div`
  flex-direction: column;
  width: 90%;
  margin: 0 auto;
`;

const PlatformStatusIcon = styled.div`
  font-size: 2rem;
`;

const DashboardGlobalHealth = () => {
  const intl = useIntl();
  const theme = useTheme();
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
    <GlobalHealthContainer>
      <div className="datacenter">
        <SpacedBox ml={12} mr={12}>
          <PlatformStatusIcon>
            <StatusWrapper status={platformStatus}>
              <StatusIcon status={platformStatus} className="fa fa-warehouse" />
            </StatusWrapper>
          </PlatformStatusIcon>
        </SpacedBox>

        <LargerText>{intl.formatMessage({ id: 'platform' })}</LargerText>
      </div>
      <div className="healthbar">
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
                  <SmallerText style={{ minWidth: '30rem', display: 'block' }}>
                    {intl
                      .formatMessage({
                        id: 'global_health_explanation',
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
                <i
                  className="fas fa-question-circle"
                  style={{ color: theme.buttonSecondary }}
                ></i>
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
      </div>

      <div className="alerts">
        <SpacedBox ml={24}>
          <DashboardAlerts />
        </SpacedBox>
      </div>
    </GlobalHealthContainer>
  );
};

export default DashboardGlobalHealth;
