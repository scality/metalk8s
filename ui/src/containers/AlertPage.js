//@flow
import React from 'react';
import styled, { useTheme } from 'styled-components';
import { useAlerts } from './AlertProvider';
import { intl } from '../translations/IntlGlobalProvider';
import { Chips } from '@scality/core-ui';

const AlertPageHeaderContainer = styled.div`
  background: ${(props) => props.theme.brand.backgroundLevel2};
  display: flex;
`;

const Title = styled.div``;
const Separator = styled.div``;
const SecondaryTitle = styled.div``;

function AlertLogo({
  color,
}: {
  color: 'statusHealthy' | 'statusWarning' | 'statusCritical',
}) {
  const theme = useTheme();
  return (
    <svg
      width="66"
      height="66"
      viewBox="0 0 66 66"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="33" cy="33" r="32" fill={theme.brand.backgroundLevel1} stroke={theme.brand.infoPrimary} />
      <path
        d="M33 50C35.1875 50 36.9375 48.25 36.9375 46H29C29 48.25 30.75 50 33 50ZM46.4375 40.6875C45.25 39.375 42.9375 37.4375 42.9375 31C42.9375 26.1875 39.5625 22.3125 34.9375 21.3125V20C34.9375 18.9375 34.0625 18 33 18C31.875 18 31 18.9375 31 20V21.3125C26.375 22.3125 23 26.1875 23 31C23 37.4375 20.6875 39.375 19.5 40.6875C19.125 41.0625 18.9375 41.5625 19 42C19 43.0625 19.75 44 21 44H44.9375C46.1875 44 46.9375 43.0625 47 42C47 41.5625 46.8125 41.0625 46.4375 40.6875Z"
        fill={theme.brand[color]}
      />
    </svg>
  );
}

function AlertPageHeader({
  activeAlerts,
  critical,
  warning,
}: {
  activeAlerts: number,
  critical: number,
  warning: number,
}) {
  return <AlertPageHeaderContainer>
      <AlertLogo color={critical > 0 ? 'statusCritical': warning > 0 ? 'statusWarning' : 'statusHealthy'} />

      <Title>{intl.translate('alerts')}</Title>

      <Separator />

      <SecondaryTitle>
        {intl.translate('active_alerts')}
      </SecondaryTitle>

      <Separator />

      <>Critical <Chips text={`${critical}`} variant="statusCritical"/></>
      <>Warning <Chips text={`${warning}`} variant="statusWarning"/></>
  </AlertPageHeaderContainer>;
}

export function AlertPage() {
  const alerts = useAlerts({});
  // $flow-disable-line
  const leafAlerts = alerts?.alerts.filter(alert => !alert.labels.children) || [];
  const criticalAlerts = leafAlerts.filter(alert => alert.severity === 'critical')
  const wariningAlerts = leafAlerts.filter(alert => alert.severity === 'warning')

  return (
    <>
      <AlertPageHeader activeAlerts={leafAlerts.length} critical={criticalAlerts.length} warning={wariningAlerts.length} />
    </>
  );
}
