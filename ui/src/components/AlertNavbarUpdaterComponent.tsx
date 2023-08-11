import { useEffect } from 'react';
import AlertProvider, { useAlerts } from '../containers/AlertProvider';
import { Alert } from '../services/alertUtils';
import FederatedIntlProvider from '../containers/IntlProvider';
import {
  AppConfigProvider,
  AppConfigProviderWithoutRedux,
  useConfig,
} from '../FederableApp';
import ConfigProvider from '../containers/ConfigProvider';

type Notification = {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  redirectUrl: string;
  createdOn: Date;
};

const WATCHDOG_ALERT_NAME = 'Watchdog';
const CRITICAL_NOTIFICATION_ID = 'CriticalNotification';
const WARNING_NOTIFICATION_ID = 'WarningNotification';

export default function AlertNavbarUpdaterComponent({
  publishNotification,
  unPublishNotification,
}: {
  publishNotification: (notification: Notification) => void;
  unPublishNotification: (id: string) => void;
}) {
  return (
    <FederatedIntlProvider>
      <ConfigProvider>
        <AppConfigProvider
          componentWithInjectedImports={AppConfigProviderWithoutRedux}
        >
          <AlertProvider>
            <AlertNavbarUpdaterComponentInteral
              publishNotification={publishNotification}
              unPublishNotification={unPublishNotification}
            />
          </AlertProvider>
        </AppConfigProvider>
      </ConfigProvider>
    </FederatedIntlProvider>
  );
}

export const AlertNavbarUpdaterComponentInteral = ({
  publishNotification,
  unPublishNotification,
}: {
  publishNotification: (notification: Notification) => void;
  unPublishNotification: (id: string) => void;
}) => {
  const { alerts } = useAlerts({});
  alerts.sort((a: Alert, b: Alert) => {
    return new Date(b.startsAt) > new Date(a.startsAt);
  });
  const { ui_base_path } = useConfig();
  const watchdogAlert = alerts.find(
    (alert: Alert) => alert.labels.alertname === WATCHDOG_ALERT_NAME,
  );
  const criticalAlerts = alerts.filter(
    (alert: Alert) => alert.severity === 'critical',
  );
  const warningAlerts = alerts.filter(
    (alert: Alert) => alert.severity === 'warning',
  );

  useEffect(() => {
    if (criticalAlerts.length) {
      unPublishNotification(CRITICAL_NOTIFICATION_ID);
      publishNotification({
        id: CRITICAL_NOTIFICATION_ID,
        title: 'Alerts',
        description:
          warningAlerts.length > 0
            ? `There are ${criticalAlerts.length} critical alert${
                criticalAlerts.length > 1 ? 's' : ''
              } and ${warningAlerts.length} warning alert${
                warningAlerts.length > 1 ? 's' : ''
              } generated on the platform.`
            : `There are ${criticalAlerts.length} critical alert${
                criticalAlerts.length > 1 ? 's' : ''
              } generated on the platform.`,
        severity: 'critical',
        redirectUrl: `${ui_base_path === '/' ? '' : ui_base_path}/alerts`,
        createdOn: new Date(criticalAlerts[0].startsAt), // the time latest raised alert
      });
    } else if (warningAlerts.length) {
      unPublishNotification(WARNING_NOTIFICATION_ID);
      publishNotification({
        id: WARNING_NOTIFICATION_ID,
        title: 'Alerts',
        description: `There are ${warningAlerts.length} warning alert${
          warningAlerts.length > 1 ? 's' : ''
        } generated on the platform.`,
        severity: 'warning',
        redirectUrl: `${ui_base_path === '/' ? '' : ui_base_path}/alerts`,
        createdOn: new Date(warningAlerts[0].startsAt),
      });
    } else if (watchdogAlert === undefined) {
      // If there's no watchdog alert, the alert system is down, and we must send a critical notification.
      publishNotification({
        id: WATCHDOG_ALERT_NAME,
        title: 'Alerts',
        description: 'Alert System Unavailable',
        severity: 'critical',
        redirectUrl: `${ui_base_path === '/' ? '' : ui_base_path}/alerts`,
        createdOn: new Date(),
      });
      unPublishNotification(CRITICAL_NOTIFICATION_ID);
      unPublishNotification(WARNING_NOTIFICATION_ID);
    } else {
      unPublishNotification(CRITICAL_NOTIFICATION_ID);
      unPublishNotification(WARNING_NOTIFICATION_ID);
      unPublishNotification(WATCHDOG_ALERT_NAME);
    }
  }, [
    criticalAlerts.length,
    warningAlerts.length,
    watchdogAlert === undefined,
  ]);

  return <></>;
};
