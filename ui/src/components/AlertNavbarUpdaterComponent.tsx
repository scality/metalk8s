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

const LOCAL_STORAGE_ALL_ALERTS_ID = 'alertIDs';

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
            <AlertNavbarUpdaterComponentInternal
              publishNotification={publishNotification}
              unPublishNotification={unPublishNotification}
            />
          </AlertProvider>
        </AppConfigProvider>
      </ConfigProvider>
    </FederatedIntlProvider>
  );
}

function publishCriticalNotification(
  publishNotification: (notification: Notification) => void,
  warningAlerts: Alert[],
  criticalAlerts: Alert[],
  ui_base_path: string | undefined,
) {
  const alertsNum = criticalAlerts.length + warningAlerts.length;
  publishNotification({
    id: CRITICAL_NOTIFICATION_ID,
    title: 'Alerts',
    description:
      warningAlerts.length > 0
        ? `There ${alertsNum > 1 ? 'are' : 'is'} ${
            criticalAlerts.length
          } critical alert${criticalAlerts.length > 1 ? 's' : ''} and ${
            warningAlerts.length
          } warning alert${
            warningAlerts.length > 1 ? 's' : ''
          } currently firing on the platform.`
        : `There ${alertsNum > 1 ? 'are' : 'is'} ${
            criticalAlerts.length
          } critical alert${
            criticalAlerts.length > 1 ? 's' : ''
          } currently firing on the platform.`,
    severity: 'critical',
    redirectUrl: `${ui_base_path === '/' ? '' : ui_base_path}/alerts`,
    createdOn: new Date(criticalAlerts[0].startsAt),
  });
}
function publishWarningNotification(
  publishNotification: (notification: Notification) => void,
  warningAlerts: Alert[],
  ui_base_path: string | undefined,
) {
  const alertsNum = warningAlerts.length;
  publishNotification({
    id: WARNING_NOTIFICATION_ID,
    title: 'Alerts',
    description: `There ${alertsNum > 1 ? 'are' : 'is'} ${
      warningAlerts.length
    } warning alert${
      warningAlerts.length > 1 ? 's' : ''
    } currently firing on the platform.`,
    severity: 'warning',
    redirectUrl: `${ui_base_path === '/' ? '' : ui_base_path}/alerts`,
    createdOn: new Date(warningAlerts[0].startsAt),
  });
}

export const AlertNavbarUpdaterComponentInternal = ({
  publishNotification,
  unPublishNotification,
}: {
  publishNotification: (notification: Notification) => void;
  unPublishNotification: (id: string) => void;
}) => {
  const { alerts } = useAlerts({});
  alerts.sort((a: Alert, b: Alert) => {
    return new Date(b.startsAt) > new Date(a.startsAt) ? 1 : -1;
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
    const alertsId = localStorage.getItem(LOCAL_STORAGE_ALL_ALERTS_ID);
    // We store all the alerts id with comma separated in localstorage,
    // we need to check if there is any new alert raised, if yes, we need to publish the notification.
    const alertsIdArray = alertsId ? alertsId.split(',') : [];
    // check if all the criticalAlerts item belongs to part of the alertsIdArray
    const newlyRaisedAlertNum = alerts.filter((alert) => {
      if (!alertsIdArray.includes(alert.id)) {
        return alert.id;
      }
    }).length;
    if (watchdogAlert === undefined) {
      unPublishNotification(CRITICAL_NOTIFICATION_ID);
      unPublishNotification(WARNING_NOTIFICATION_ID);
      // If there's no watchdog alert, the alert system is down, and we must send a critical notification.
      publishNotification({
        id: WATCHDOG_ALERT_NAME,
        title: 'Alerts',
        description: 'Alerting Service is Unavailable',
        severity: 'critical',
        redirectUrl: `${ui_base_path === '/' ? '' : ui_base_path}/alerts`,
        createdOn: new Date(),
      });
    } else if (criticalAlerts.length) {
      unPublishNotification(WATCHDOG_ALERT_NAME);
      unPublishNotification(WARNING_NOTIFICATION_ID);
      if (newlyRaisedAlertNum) {
        unPublishNotification(CRITICAL_NOTIFICATION_ID);
      }
      publishCriticalNotification(
        publishNotification,
        warningAlerts,
        criticalAlerts,
        ui_base_path,
      );
    } else if (warningAlerts.length) {
      unPublishNotification(WATCHDOG_ALERT_NAME);
      unPublishNotification(CRITICAL_NOTIFICATION_ID);
      if (newlyRaisedAlertNum) {
        unPublishNotification(WARNING_NOTIFICATION_ID);
      }
      publishWarningNotification(
        publishNotification,
        warningAlerts,
        ui_base_path,
      );
    } else {
      unPublishNotification(CRITICAL_NOTIFICATION_ID);
      unPublishNotification(WARNING_NOTIFICATION_ID);
      unPublishNotification(WATCHDOG_ALERT_NAME);
    }

    // Update the alerts Id in the localstorage
    localStorage.setItem(
      LOCAL_STORAGE_ALL_ALERTS_ID,
      `${alerts.map((alert) => alert.id).join(',')}`,
    );
  }, [
    criticalAlerts.length,
    warningAlerts.length,
    watchdogAlert === undefined,
  ]);

  return <></>;
};
