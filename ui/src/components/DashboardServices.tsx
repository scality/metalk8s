import React from 'react';
import styled from 'styled-components';
import { useIntl } from 'react-intl';
import { spacing } from '@scality/core-ui';
import { PageSubtitle } from '../components/style/CommonLayoutStyle';
import { useAlertLibrary, useHighestSeverityAlerts, highestAlertToStatus } from '../containers/AlertProvider';
import HealthItem from './HealthItem';
const ServiceItems = styled.div`
  display: flex;
  flex-direction: column;
  padding: ${spacing.r4};
`;
/* Fully restacked, the inventory cell spans the whole content box while the two
   chart panels below it compete for what height is left. Lay the three service
   groups side by side there so the cell stays short instead of stacking eight
   items down the page. */
const ServiceGroups = styled.div`
  display: flex;
  flex-direction: column;
  @container responsive (max-width: 700px) {
    flex-direction: row;
    flex-wrap: wrap;
    gap: ${spacing.r16};
    > * {
      flex: 1 1 11rem;
    }
  }
`;

const DashboardServices = () => {
  const intl = useIntl();
  const alertsLibrary = useAlertLibrary();
  // K8s Master
  const k8sHighestSeverityAlert = useHighestSeverityAlerts(alertsLibrary.getK8SMasterAlertSelectors());
  const k8sStatus = highestAlertToStatus(k8sHighestSeverityAlert);
  // Bootstrap
  const bootstrapHighestSeverityAlert = useHighestSeverityAlerts(alertsLibrary.getBootstrapAlertSelectors());
  const bootstrapStatus = highestAlertToStatus(bootstrapHighestSeverityAlert);
  // Monitoring
  const monitoringHighestSeverityAlert = useHighestSeverityAlerts(alertsLibrary.getMonitoringAlertSelectors());
  const monitoringStatus = highestAlertToStatus(monitoringHighestSeverityAlert);
  // Alerting
  const alertingHighestSeverityAlert = useHighestSeverityAlerts(alertsLibrary.getAlertingAlertSelectors());
  const alertingStatus = highestAlertToStatus(alertingHighestSeverityAlert);
  // Logging
  const loggingHighestSeverityAlert = useHighestSeverityAlerts(alertsLibrary.getLoggingAlertSelectors());
  const loggingStatus = highestAlertToStatus(loggingHighestSeverityAlert);
  // Dashboarding
  const dashboardingHighestSeverityAlert = useHighestSeverityAlerts(alertsLibrary.getDashboardingAlertSelectors());
  const dashboardingStatus = highestAlertToStatus(dashboardingHighestSeverityAlert);
  // Ingress Controller
  const ingressHighestSeverityAlert = useHighestSeverityAlerts(alertsLibrary.getIngressControllerAlertSelectors());
  const ingressStatus = highestAlertToStatus(ingressHighestSeverityAlert);
  // Authentication
  const authenticationHighestSeverityAlert = useHighestSeverityAlerts(alertsLibrary.getAuthenticationAlertSelectors());
  const authenticationStatus = highestAlertToStatus(authenticationHighestSeverityAlert);
  return (
    <div>
      <PageSubtitle aria-label="service">
        {intl.formatMessage({
          id: 'services',
        })}
      </PageSubtitle>

      <ServiceGroups>
        <ServiceItems>
          <PageSubtitle aria-label="core">
          {intl.formatMessage({
            id: 'core',
          })}
        </PageSubtitle>
        <HealthItem label={'K8s master'} status={k8sStatus} alerts={k8sHighestSeverityAlert} />
        <HealthItem label={'Bootstrap'} status={bootstrapStatus} alerts={bootstrapHighestSeverityAlert} />
      </ServiceItems>
      <ServiceItems>
        <PageSubtitle aria-label="observability">
          {intl.formatMessage({
            id: 'observability',
          })}
        </PageSubtitle>
        <HealthItem label={'Monitoring'} status={monitoringStatus} alerts={monitoringHighestSeverityAlert} />
        <HealthItem label={'Alerting'} status={alertingStatus} alerts={alertingHighestSeverityAlert} />
        <HealthItem label={'Logging'} status={loggingStatus} alerts={loggingHighestSeverityAlert} />
        <HealthItem label={'Dashboarding'} status={dashboardingStatus} alerts={dashboardingHighestSeverityAlert} />
      </ServiceItems>
      <ServiceItems>
        <PageSubtitle aria-label="access">
          {intl.formatMessage({
            id: 'access',
          })}
        </PageSubtitle>
        <HealthItem label={'Ingress Controller'} status={ingressStatus} alerts={ingressHighestSeverityAlert} />
        <HealthItem
          label={intl.formatMessage({
            id: 'authentication',
          })}
          status={authenticationStatus}
          alerts={authenticationHighestSeverityAlert}
        />
      </ServiceItems>
      </ServiceGroups>
    </div>
  );
};

export default DashboardServices;
