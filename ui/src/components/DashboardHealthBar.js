import React, { useCallback } from 'react';
import { GlobalHealthBar, Tooltip, Loader } from '@scality/core-ui';
import styled from 'styled-components';
import { useIntl } from 'react-intl';
import { spacing } from '@scality/core-ui/dist/style/theme';
import { getAlertsLoki, isLokiReady } from '../services/loki/api';
import { useQuery } from 'react-query';
import { REFRESH_GLOBAL_HEALTH_BAR } from '../constants';
import { useMetricsTimeSpan } from '../hooks';
import {
  highestAlertToStatus,
  useAlertLibrary,
  useHighestSeverityAlerts,
} from '../containers/AlertProvider';

const GlobalHealthContainer = styled.div`
  display: flex;
  flex-direction: column;
`;

const TitleContainer = styled.div`
  display: flex;
  & > div {
    margin-right: ${spacing.sp16};
  }
  i {
    color: ${(props) => props.theme.buttonSecondary};
  }
`;

const HealthCircle = styled.div`
  height: ${(props) => props.size};
  width: ${(props) => props.size};
  background-color: ${(props) =>
    props.theme[
      'status' + props.variant.replace(/^\w/, (c) => c.toUpperCase())
    ]};
  border-radius: 50%;
  display: inline-block;
`;

const DashboardHealthBar = () => {
  const intl = useIntl();
  const alertsLibrary = useAlertLibrary();
  const platformAlerts = useHighestSeverityAlerts(
    alertsLibrary.getPlatformAlertSelectors(),
  );
  const [metricsTimeSpan] = useMetricsTimeSpan();
  const start = new Date(
    new Date().getTime() - metricsTimeSpan * 1000,
  ).toISOString();
  const end = new Date().toISOString();

  const { data, isLoading } = useQuery(
    ['dashboardHealthBar', metricsTimeSpan],
    useCallback(async () => {
      if (await isLokiReady()) return getAlertsLoki(start, end);
      else return [];
      // Can't add start/end to dependencies because these dates are modified on every render
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [metricsTimeSpan]),
    {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchInterval: REFRESH_GLOBAL_HEALTH_BAR,
      refetchIntervalInBackground: true,
    },
  );

  return (
    <GlobalHealthContainer>
      <TitleContainer>
        <div>{intl.formatMessage({ id: 'global_health' })}</div>
        <Tooltip
          overlay={
            <div style={{ width: '300px' }}>
              The Global Health is the overall status of your Platform over a
              specific period.
              <br />
              <br />
              The statuses of the Volumes and Nodes, the Network and the
              Services are monitored.
              <br />
              <br />
              <HealthCircle size={spacing.sp8} variant="healthy" /> OK, the
              Platform is healthy.
              <br />
              <HealthCircle size={spacing.sp8} variant="warning" /> Warning, the
              Platform is degraded but not at risk.
              <br />
              <HealthCircle size={spacing.sp8} variant="critical" /> Critical
              status, the Platform is degraded and at risk.
              <br />
              <br />
              Hover or click on an alert segment on the Global Health bar for
              more details.
            </div>
          }
          placement="bottom"
        >
          <i className="fas fa-question-circle" />
        </Tooltip>
        <HealthCircle
          size={spacing.sp16}
          variant={highestAlertToStatus(platformAlerts)}
        />
      </TitleContainer>
      {isLoading && !data ? (
        <Loader />
      ) : (
        <GlobalHealthBar
          id={'dashboard-global-health-bar'}
          alerts={data}
          start={start}
          end={end}
        />
      )}
    </GlobalHealthContainer>
  );
};

export default DashboardHealthBar;
