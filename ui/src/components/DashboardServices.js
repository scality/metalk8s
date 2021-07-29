// @flow
import React from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { Tooltip } from '@scality/core-ui';
import {
  spacing,
  fontSize,
  fontWeight,
} from '@scality/core-ui/dist/style/theme';

import type { Alert } from '../services/alertUtils';
import { PageSubtitle } from '../components/style/CommonLayoutStyle';
import {
  useAlertLibrary,
  useHighestSeverityAlerts,
  highestAlertToStatus,
} from '../containers/AlertProvider';
import CircleStatus from './CircleStatus';
import {
  STATUS_WARNING,
  STATUS_CRITICAL,
  STATUS_SUCCESS,
  STATUS_HEALTH,
} from '../constants.js';

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
`;

const NonHealthyPopUpSeverity = styled.div`
  color: ${(props) => {
    const theme = props.theme;
    let color;

    switch (props.status) {
      case STATUS_HEALTH:
      case STATUS_SUCCESS:
        color = theme.statusHealthy;
        break;
      case STATUS_WARNING:
        color = theme.statusWarning;
        break;
      case STATUS_CRITICAL:
        color = theme.statusCritical;
        break;
      default:
        color = theme.statusHealthy;
    }
    return color;
  }};
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
  status: string,
  alerts: Alert[],
}) => {
  let date = null;

  const getStartDate = (alerts: Alert[]) => {
    // Check we only have alerts and set startsAt properties
    const filtered = alerts.filter((item) => item && item.startsAt);
    // Sort to make sure we have oldest alert first
    filtered.sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));

    if (filtered[0] && filtered[0].startsAt) return filtered[0].startsAt;
    return '';
  };

  if (alerts.length) date = new Date(getStartDate(alerts));

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
              <NonHealthyPopUpTitle>View details</NonHealthyPopUpTitle>
              <NonHealthyPopUpItem>
                <label>Severity</label>
                <NonHealthyPopUpSeverity status={status}>
                  {status}
                </NonHealthyPopUpSeverity>
              </NonHealthyPopUpItem>
              {
                // Checking date validity
                date instanceof Date && !isNaN(date) && (
                  <NonHealthyPopUpItem>
                    <label>Start</label>
                    <div>
                      {`${date.toISOString().split('T')[0]}
              ${date.toISOString().split('T')[1].slice(0, 8)}`}
                    </div>
                  </NonHealthyPopUpItem>
                )
              }
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
  const k8sAlerts = useHighestSeverityAlerts(
    alertsLibrary.getK8SMasterAlertSelectors(),
  );
  const k8sStatus = highestAlertToStatus(k8sAlerts);

  // Bootstrap
  const bootstrapAlerts = useHighestSeverityAlerts(
    alertsLibrary.getBootstrapAlertSelectors(),
  );
  const bootstrapStatus = highestAlertToStatus(bootstrapAlerts);

  // Monitoring
  const monitoringAlerts = useHighestSeverityAlerts(
    alertsLibrary.getMonitoringAlertSelectors(),
  );
  const monitoringStatus = highestAlertToStatus(monitoringAlerts);

  // Alerting
  const alertingAlerts = useHighestSeverityAlerts(
    alertsLibrary.getAlertingAlertSelectors(),
  );
  const alertingStatus = highestAlertToStatus(alertingAlerts);

  // Logging
  const loggingAlerts = useHighestSeverityAlerts(
    alertsLibrary.getLoggingAlertSelectors(),
  );
  const loggingStatus = highestAlertToStatus(loggingAlerts);

  // Dashboarding
  const dashboardingAlerts = useHighestSeverityAlerts(
    alertsLibrary.getDashboardingAlertSelectors(),
  );
  const dashboardingStatus = highestAlertToStatus(dashboardingAlerts);

  // Ingress Controller
  const ingressAlerts = useHighestSeverityAlerts(
    alertsLibrary.getIngressControllerAlertSelectors(),
  );
  const ingressStatus = highestAlertToStatus(ingressAlerts);

  // Authentication
  const authenticationAlerts = useHighestSeverityAlerts(
    alertsLibrary.getAuthenticationAlertSelectors(),
  );
  const authenticationStatus = highestAlertToStatus(authenticationAlerts);

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
          alerts={k8sAlerts}
        />
        <ServiceItem
          label={'Bootstrap'}
          status={bootstrapStatus}
          alerts={bootstrapAlerts}
        />
      </ServiceItems>
      <ServiceItems>
        <PageSubtitle aria-label="observability">
          {intl.formatMessage({ id: 'observability' })}
        </PageSubtitle>
        <ServiceItem
          label={'Monitoring'}
          status={monitoringStatus}
          alerts={monitoringAlerts}
        />
        <ServiceItem
          label={'Alerting'}
          status={alertingStatus}
          alerts={alertingAlerts}
        />
        <ServiceItem
          label={'Logging'}
          status={loggingStatus}
          alerts={loggingAlerts}
        />
        <ServiceItem
          label={'Dashboarding'}
          status={dashboardingStatus}
          alerts={dashboardingAlerts}
        />
      </ServiceItems>
      <ServiceItems>
        <PageSubtitle aria-label="access">
          {intl.formatMessage({ id: 'access' })}
        </PageSubtitle>
        <ServiceItem
          label={'Ingress Controller'}
          status={ingressStatus}
          alerts={ingressAlerts}
        />
        <ServiceItem
          label={intl.formatMessage({ id: 'authentication' })}
          status={authenticationStatus}
          alerts={authenticationAlerts}
        />
      </ServiceItems>
    </div>
  );
};

export default DashboardServices;
