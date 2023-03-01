import React from 'react';
import styled from 'styled-components';
import { useIntl } from 'react-intl';
import { spacing } from '@scality/core-ui/dist/style/theme';
import { PageSubtitle } from '../components/style/CommonLayoutStyle';
import {
  useAlertLibrary,
  useHighestSeverityAlerts,
  highestAlertToStatus,
} from '../containers/AlertProvider';
import HealthItem from './HealthItem';
const ServiceItems = styled.div`
  display: flex;
  flex-direction: column;
  padding: ${spacing.sp4};
`;

const DashboardServices = () => {
  const intl = useIntl();
  const alertsLibrary = useAlertLibrary();
  // K8s Master
  const k8sHighestSeverityAlert = useHighestSeverityAlerts(
    alertsLibrary.getK8SMasterAlertSelectors(),
  );
  const k8sStatus = highestAlertToStatus(k8sHighestSeverityAlert);
  // Bootstrap
  const bootstrapHighestSeverityAlert = useHighestSeverityAlerts(
    alertsLibrary.getBootstrapAlertSelectors(),
  );
  const bootstrapStatus = highestAlertToStatus(bootstrapHighestSeverityAlert);
  // Monitoring
  const monitoringHighestSeverityAlert = useHighestSeverityAlerts(
    alertsLibrary.getMonitoringAlertSelectors(),
  );
  const monitoringStatus = highestAlertToStatus(monitoringHighestSeverityAlert);
  // Alerting
  const alertingHighestSeverityAlert = useHighestSeverityAlerts(
    alertsLibrary.getAlertingAlertSelectors(),
  );
  const alertingStatus = highestAlertToStatus(alertingHighestSeverityAlert);
  // Logging
  const loggingHighestSeverityAlert = useHighestSeverityAlerts(
    alertsLibrary.getLoggingAlertSelectors(),
  );
  const loggingStatus = highestAlertToStatus(loggingHighestSeverityAlert);
  // Dashboarding
  const dashboardingHighestSeverityAlert = useHighestSeverityAlerts(
    alertsLibrary.getDashboardingAlertSelectors(),
  );
  const dashboardingStatus = highestAlertToStatus(
    dashboardingHighestSeverityAlert,
  );
  // Ingress Controller
  const ingressHighestSeverityAlert = useHighestSeverityAlerts(
    alertsLibrary.getIngressControllerAlertSelectors(),
  );
  const ingressStatus = highestAlertToStatus(ingressHighestSeverityAlert);
  // Authentication
  const authenticationHighestSeverityAlert = useHighestSeverityAlerts(
    alertsLibrary.getAuthenticationAlertSelectors(),
  );
  const authenticationStatus = highestAlertToStatus(
    authenticationHighestSeverityAlert,
  );
  return (
    <div>
      <PageSubtitle aria-label="service">
        {intl.formatMessage({
          id: 'services',
        })}
      </PageSubtitle>

      <ServiceItems>
        <PageSubtitle aria-label="core">
          {intl.formatMessage({
            id: 'core',
          })}
        </PageSubtitle>
        <HealthItem
          label={'K8s master'}
          status={k8sStatus}
          alerts={k8sHighestSeverityAlert}
        />
        <HealthItem
          label={'Bootstrap'}
          status={bootstrapStatus}
          alerts={bootstrapHighestSeverityAlert}
        />
      </ServiceItems>
      <ServiceItems>
        <PageSubtitle aria-label="observability">
          {intl.formatMessage({
            id: 'observability',
          })}
        </PageSubtitle>
        <HealthItem
          label={'Monitoring'}
          status={monitoringStatus}
          alerts={monitoringHighestSeverityAlert}
        />
        <HealthItem
          label={'Alerting'}
          status={alertingStatus}
          alerts={alertingHighestSeverityAlert}
        />
        <HealthItem
          label={'Logging'}
          status={loggingStatus}
          alerts={loggingHighestSeverityAlert}
        />
        <HealthItem
          label={'Dashboarding'}
          status={dashboardingStatus}
          alerts={dashboardingHighestSeverityAlert}
        />
      </ServiceItems>
      <ServiceItems>
        <PageSubtitle aria-label="access">
          {intl.formatMessage({
            id: 'access',
          })}
        </PageSubtitle>
        <HealthItem
          label={'Ingress Controller'}
          status={ingressStatus}
          alerts={ingressHighestSeverityAlert}
        />
        <HealthItem
          label={intl.formatMessage({
            id: 'authentication',
          })}
          status={authenticationStatus}
          alerts={authenticationHighestSeverityAlert}
        />
      </ServiceItems>
    </div>
  );
};

export default DashboardServices;