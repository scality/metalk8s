import React from 'react';
import styled from 'styled-components';
import { TextBadge } from './style/CommonLayoutStyle';
import { useIntl } from 'react-intl';
import { spacing } from '@scality/core-ui/dist/style/theme';
import {
  useLinkOpener,
  useDiscoveredViews,
} from '../containers/ConfigProvider';
import { useHistory } from 'react-router';
import {
  EmphaseText,
  SecondaryText,
} from '@scality/core-ui/dist/components/text/Text.component';
import { useAlertLibrary, useAlerts } from '../containers/AlertProvider';
import SpacedBox from '@scality/core-ui/dist/components/spacedbox/SpacedBox';
import { getChildrenAlerts } from '../services/alertUtils';

const AlertsContainer = styled.div`
  display: flex;
  flex-direction: column;
`;

const BadgesContainer = styled.div`
  display: flex;
  & > div {
    margin-right: ${spacing.sp16};
  }
`;

const Link = styled.div`
  color: ${(props) => props.theme.textLink};
  cursor: pointer;
  margin-left: auto;
  text-decoration: none;
  text-align: right;
  &:hover {
    text-decoration: underline;
  }
`;

const DashboardAlerts = () => {
  const { openLink } = useLinkOpener();
  const history = useHistory();
  const discoveredViews = useDiscoveredViews();
  const alertView = discoveredViews.find(
    (view) => view.view.path === '/alerts',
  );
  const intl = useIntl();
  const alertsLibrary = useAlertLibrary();
  const topLevelAlerts = useAlerts(alertsLibrary.getPlatformAlertSelectors());
  const alerts = useAlerts({});
  // in MetalK8s dashboard, we want to display the number of the alerts only for metalk8s namespace
  const metalk8sAtomicAlerts = getChildrenAlerts(
    topLevelAlerts.alerts.map((alert) => alert.childrenJsonPath) || [],
    alerts.alerts,
  );
  const criticalAlerts = metalk8sAtomicAlerts.filter(
    (alert) => alert.severity === 'critical',
  );
  const warningAlerts = metalk8sAtomicAlerts.filter(
    (alert) => alert.severity === 'warning',
  );
  const totalAlerts = criticalAlerts.length + warningAlerts.length;

  return (
    <AlertsContainer>
      <div>
        <EmphaseText>
          {intl.formatMessage({ id: 'platform_active_alerts' })}
        </EmphaseText>
        <TextBadge variant="infoPrimary" data-testid="all-alert-badge">
          {totalAlerts}
        </TextBadge>
      </div>
      {totalAlerts === 0 ? (
        <SecondaryText>
          {intl.formatMessage({ id: 'no_active_alerts' })}
        </SecondaryText>
      ) : (
        <SpacedBox pr={24}>
          <BadgesContainer>
            <div>
              Critical
              <TextBadge
                variant="statusCritical"
                data-testid="critical-alert-badge"
              >
                {criticalAlerts.length}
              </TextBadge>
            </div>
            <div>
              Warning
              <TextBadge
                variant="statusWarning"
                data-testid="warning-alert-badge"
              >
                {warningAlerts.length}
              </TextBadge>
            </div>
          </BadgesContainer>
          <Link
            onClick={() => {
              openLink(alertView);
              history.replace('/alerts');
            }}
            data-testid="view-all-link"
          >
            {intl.formatMessage({ id: 'view_all' })} >
          </Link>
        </SpacedBox>
      )}
    </AlertsContainer>
  );
};

export default DashboardAlerts;
