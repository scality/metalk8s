import type { PrometheusAlert, AlertLabels } from './alertManager';
import type { StreamValue } from './loki';
export const STATUS_WARNING = 'warning';
export const STATUS_CRITICAL = 'critical';
export const STATUS_SUCCESS = 'success';
export const STATUS_NONE = 'none';
export const STATUS_HEALTH = 'healthy';
export const STATUS_INFO = 'info';
export type Health = 'healthy' | 'warning' | 'critical' | 'none' | 'info';
export type FilterLabels = {
  selectors?: string[];
  [labelName: string]: string | string[];
};
// Note that `summary` and `runbook_url` are optional in alert annotations.
export type Alert = {
  id: string;
  description: string;
  startsAt: string;
  endsAt: string;
  severity: string;
  labels: AlertLabels;
  originalAlert: PrometheusAlert;
  status: string;
  summary?: string;
  documentationUrl?: string;
};
export const compareHealth = (status1, status2) => {
  const weights = {};
  weights[STATUS_CRITICAL] = 3;
  weights[STATUS_WARNING] = 2;
  weights[STATUS_NONE] = 1;
  weights[STATUS_HEALTH] = 0;
  return weights[status1] - weights[status2];
};

// Return boolean if the two alerts have the same labels but different severity
const isSameAlertWithDiffSeverity = (
  alert1: AlertLabels,
  alert2: AlertLabels,
): boolean => {
  // filter out the `severity`, `summary` and `children`property
  function replacer(key, value) {
    if (key === 'severity' || key === 'summary' || key === 'children') {
      return undefined;
    }

    return value;
  }

  return JSON.stringify(alert1, replacer) === JSON.stringify(alert2, replacer);
};

/* 
  This function removes the warning alert from the list when critical one is triggered
  It should be called at saga level before storing the alerts to `redux-store`
  or where we resolve the promise with `react-query` 
  */
export const removeWarningAlerts = (alerts: Alert[]): Alert[] => {
  const criticalAlerts = alerts.filter((alert) => {
    if (alert.severity === STATUS_CRITICAL) {
      return true;
    }
    // check if there is a critical alert with the same labels
    const isSameAlert = alerts.find((a) => {
      return (
        a.severity === STATUS_CRITICAL &&
        isSameAlertWithDiffSeverity(a.labels, alert.labels)
      );
    });
    return !isSameAlert;
  });
  return criticalAlerts;
};
// Sort the alerts base on the `severity`
export const sortAlerts = (alerts: Alert[]): Alert[] => {
  return alerts.sort(function (a, b) {
    return compareHealth(b.labels.severity, a.labels.severity);
  });
};

/* 
  Format the alerts from AM
  Keep the original alert to make sure we can acces specific info in the alert list if necessary.
  Because we don't want to change the implementation because of any API changes.
  */
export const formatActiveAlerts = (alerts: Array<PrometheusAlert>): Alert[] => {
  // @ts-expect-error - FIXME when you are working on it
  return alerts.map((alert) => {
    return {
      id: alert.fingerprint,
      summary: (alert.annotations && alert.annotations.summary) || '',
      description: alert.annotations.description || alert.annotations.message,
      startsAt: alert.startsAt,
      endsAt: alert.endsAt || new Date().toISOString(),
      severity: alert.labels.severity,
      documentationUrl:
        (alert.annotations && alert.annotations.runbook_url) || '',
      labels: {
        ...alert.labels,
        ...alert.annotations,
        selectors:
          (alert.annotations.selectors &&
            alert.annotations.selectors.split(',')) ||
          [],
      },
      childrenJsonPath: alert.annotations && alert.annotations.childrenJsonPath,
      originalAlert: alert,
      status: alert.status.state,
    };
  });
};

/* 
  This function is used when filtering the alerts, by checking if the `labels` is 
  the subset of the `filters` object. 
  Note that: The values of the selectors can be more than one, so it's possible to be an array.
  
  e.g. alertname: [NODE_FILESYSTEM_SPACE_FILLINGUP, NODE_FILESYSTEM_ALMOST_OUTOF_SPACE, 
  NODE_FILESYSTEM_FILES_FILLINGUP, NODE_FILESYSTEM_ALMOST_OUTOF_FILES]  
  */
export const isAlertSelected = (
  labels: AlertLabels,
  filters: FilterLabels,
): boolean => {
  return Object.getOwnPropertyNames(filters)
    .map((key) => {
      if (!filters[key] || !labels[key]) return false;

      if (Array.isArray(filters[key])) {
        if (Array.isArray(labels[key])) {
          return (
            // @ts-expect-error - FIXME when you are working on it
            filters[key].find((val) => {
              return labels[key].includes(val);
            }) !== undefined
          );
        } else return filters[key].includes(labels[key]);
      } else {
        return labels[key] === filters[key];
      }
    })
    .reduce((boolA, boolB) => {
      return boolA && boolB;
    }, true);
};

/* 
  Used to filter both "active alerts" and "history alerts" base on the labels
  Props:
    alerts: the formatted alert returned by AM or Loki API.
    filters: can be optional, meaning to get all the alerts.
  */
export const filterAlerts = (
  alerts: Alert[],
  filters?: FilterLabels,
): Alert[] => {
  if (!alerts) return [];

  if (!filters) {
    return alerts;
  }

  return alerts.filter((alert) => {
    return isAlertSelected(alert.labels, filters) && alert.status === 'active';
  });
};
// check if the given time is between the start and end
export const dateIsBetween = (start: string, end: string, date: string) => {
  const dateTS = new Date(date).getTime();
  const startTS = new Date(start).getTime();
  const endTS = new Date(end).getTime();

  if (startTS <= dateTS && endTS >= dateTS) {
    return true;
  } else return false;
};
export const getHealthStatus = (
  alerts: Alert[],
  activeOn: string = new Date().toISOString(),
): Health => {
  if (!alerts.length) return STATUS_HEALTH;
  const severityArr = alerts.map((alert) => {
    if (dateIsBetween(alert.startsAt, alert.endsAt, activeOn)) {
      return alert.labels.severity;
    }

    return '';
  });
  if (severityArr.every((item) => item === '')) return STATUS_HEALTH;
  if (severityArr.find((severity) => severity === 'critical'))
    return STATUS_CRITICAL;
  else if (severityArr.find((severity) => severity === 'warning'))
    return STATUS_WARNING;
  else if (severityArr.find((severity) => severity === 'info'))
    return STATUS_INFO;
  return STATUS_NONE;
};

/*
  Format the alerts from Loki.
  We need to remove the alerts with the same ID, because the same alert may be retriggered by multiple times.
  */
export const formatHistoryAlerts = (streamValues: StreamValue): Alert[] => {
  const alerts = streamValues[0].values.reduce((agg, value) => {
    const alert = JSON.parse(value[1]);
    return {
      ...agg,
      [alert.fingerprint]: {
        id: alert.fingerprint,
        summary: (alert.annotations && alert.annotations.summary) || '',
        description: alert.annotations.description || alert.annotations.message,
        startsAt: alert.startsAt,
        endsAt:
          alert.status === 'firing' ? new Date().toISOString() : alert.endsAt,
        severity: alert.labels.severity,
        documentationUrl:
          (alert.annotations && alert.annotations.runbook_url) || '',
        labels: {
          ...alert.labels,
          selectors:
            (alert.annotations.selectors &&
              alert.annotations.selectors.split(',')) ||
            [],
        },
        originalAlert: alert,
      },
    };
  }, {});
  return Object.values(alerts);
};
