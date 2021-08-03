// @flow
import React from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { Tooltip, StatusText } from '@scality/core-ui';
import {
  spacing,
  fontSize,
  fontWeight,
} from '@scality/core-ui/dist/style/theme';

import type { Alert } from '../services/alertUtils';
import type { Status } from '../containers/AlertProvider';
import { PageSubtitle } from '../components/style/CommonLayoutStyle';
import {
  useAlertLibrary,
  useHighestSeverityAlerts,
  highestAlertToStatus,
} from '../containers/AlertProvider';
import CircleStatus from './CircleStatus';
import { STATUS_HEALTH } from '../constants.js';
import { formatDateToMid1 } from '../services/utils';

const ServiceItems = styled.div`
  display: flex;
  flex-direction: column;
  padding: ${spacing.sp4};
`;

const ServiceItemLabelWrapper = styled.div`
  display: flex;
  align-items: baseline;
`;

const ServiceItemLabel = styled.div`
  margin-left: ${spacing.sp8};
`;

const ServiceItemElement = styled.div`
  padding: ${spacing.sp4};
`;

const ClickableServiceItemElement = styled(ServiceItemElement)`
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;

  :hover {
    background-color: ${(props) => props.theme.highlight};
  }
`;

const NonHealthyServiceItemElement = styled.div`
  cursor: pointer;
  width: 100%;
  display: flex;
  flex-direction: column;

  a {
    text-decoration: none;
    color: inherit;
    width: 100%;
    display: flex;
    align-items: center;
  }
`;

const NonHealthyPopUp = styled.div`
  display: flex;
  flex-direction: column;
  font-size: ${fontSize.base};

  label {
    width: 25%;
    margin-right: ${spacing.sp8};
    color: ${(props) => props.theme.textSecondary};
    text-align: right;
  }
`;

const NonHealthyPopUpTitle = styled.div`
  font-weight: ${fontWeight.bold}
  text-align: center;
`;

const NonHealthyPopUpItem = styled.div`
  width: 100%;
  display: flex;
  margin: ${spacing.sp4} ${spacing.sp14};
  align-items: center;
`;

const ClickableIcon = styled.i`
  self-align: flex-end;
`;

const ServiceItem = ({
  label,
  status,
  alerts,
}: {
  label: string,
  status: Status,
  alerts: Alert[],
}) => {
  const intl = useIntl();

  if (!alerts.length && status === STATUS_HEALTH)
    return (
      <ServiceItemElement aria-label={label}>
        <ServiceItemLabelWrapper>
          <CircleStatus status={status} />
          <ServiceItemLabel>{label}</ServiceItemLabel>
        </ServiceItemLabelWrapper>
      </ServiceItemElement>
    );
  else
    return (
      <NonHealthyServiceItemElement>
        <Tooltip
          // Right placement to avoid Z index issues between left sidebar and tooltip or out of screen tooltip displays
          placement="top"
          overlayStyle={{
            // em sizing to handle font-size change on large screens
            width: '20em',
            height: '100%',
          }}
          overlay={
            <NonHealthyPopUp>
              <NonHealthyPopUpTitle>
                {intl.formatMessage({ id: 'view_details' })}
              </NonHealthyPopUpTitle>
              <NonHealthyPopUpItem>
                <label>{intl.formatMessage({ id: 'severity' })}</label>
                <StatusText status={status}>{status}</StatusText>
              </NonHealthyPopUpItem>
              {alerts[0] && alerts[0].startsAt && (
                <NonHealthyPopUpItem>
                  <label>{intl.formatMessage({ id: 'start' })}</label>
                  <div>{formatDateToMid1(alerts[0].startsAt)}</div>
                </NonHealthyPopUpItem>
              )}
            </NonHealthyPopUp>
          }
        >
          <Link to="/alerts" data-testid="alert-link">
            <ClickableServiceItemElement aria-label={label}>
              <ServiceItemLabelWrapper>
                <CircleStatus status={status} />
                <ServiceItemLabel>{label}</ServiceItemLabel>
              </ServiceItemLabelWrapper>
              <ClickableIcon className="fas fa-angle-right" />
            </ClickableServiceItemElement>
          </Link>
        </Tooltip>
      </NonHealthyServiceItemElement>
    );
};

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
        {intl.formatMessage({ id: 'services' })}
      </PageSubtitle>

      <ServiceItems>
        <PageSubtitle aria-label="core">
          {intl.formatMessage({ id: 'core' })}
        </PageSubtitle>
        <ServiceItem
          label={'K8s master'}
          status={k8sStatus}
          alerts={k8sHighestSeverityAlert}
        />
        <ServiceItem
          label={'Bootstrap'}
          status={bootstrapStatus}
          alerts={bootstrapHighestSeverityAlert}
        />
      </ServiceItems>
      <ServiceItems>
        <PageSubtitle aria-label="observability">
          {intl.formatMessage({ id: 'observability' })}
        </PageSubtitle>
        <ServiceItem
          label={'Monitoring'}
          status={monitoringStatus}
          alerts={monitoringHighestSeverityAlert}
        />
        <ServiceItem
          label={'Alerting'}
          status={alertingStatus}
          alerts={alertingHighestSeverityAlert}
        />
        <ServiceItem
          label={'Logging'}
          status={loggingStatus}
          alerts={loggingHighestSeverityAlert}
        />
        <ServiceItem
          label={'Dashboarding'}
          status={dashboardingStatus}
          alerts={dashboardingHighestSeverityAlert}
        />
      </ServiceItems>
      <ServiceItems>
        <PageSubtitle aria-label="access">
          {intl.formatMessage({ id: 'access' })}
        </PageSubtitle>
        <ServiceItem
          label={'Ingress Controller'}
          status={ingressStatus}
          alerts={ingressHighestSeverityAlert}
        />
        <ServiceItem
          label={intl.formatMessage({ id: 'authentication' })}
          status={authenticationStatus}
          alerts={authenticationHighestSeverityAlert}
        />
      </ServiceItems>
    </div>
  );
};

export default DashboardServices;
