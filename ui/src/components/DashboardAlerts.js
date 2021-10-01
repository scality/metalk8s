import React, { useMemo } from 'react';
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
import { useAlerts } from '../containers/AlertProvider';
import SpacedBox from '@scality/core-ui/dist/components/spacedbox/SpacedBox';

const AlertsContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
`;

const BadgesContainer = styled.div`
  display: flex;
  & > div {
    margin-right: ${spacing.sp16};
  }
`;

const TitleContainer = styled.div`
  width: 100%;
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
  const alerts = useAlerts({});
  const leafAlerts = useMemo(
    () => alerts?.alerts.filter((alert) => !alert.labels.children) || [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(alerts?.alerts)],
  );
  const criticalAlerts = leafAlerts.filter(
    (alert) => alert.severity === 'critical',
  );
  const warningAlerts = leafAlerts.filter(
    (alert) => alert.severity === 'warning',
  );
  const totalAlerts = criticalAlerts.length + warningAlerts.length;

  return (
    <AlertsContainer>
      <TitleContainer>
        <EmphaseText>
          {intl.formatMessage({ id: 'platform_active_alerts' })}
        </EmphaseText>
        <TextBadge variant="infoPrimary" data-testid="all-alert-badge">
          {totalAlerts}
        </TextBadge>
      </TitleContainer>
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
              history.push('/alerts');
              openLink(alertView);
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
