//@flow
import jp from 'jsonpath';
import {
  STATUS_CRITICAL,
  STATUS_WARNING,
  STATUS_HEALTH,
  STATUS_NONE,
} from '../constants';
import type { PrometheusAlert, AlertLabels } from './alertmanager/api';
import type { StreamValue } from './loki/api';
import { compareHealth } from './utils';

export type Health = 'healthy' | 'warning' | 'critical' | 'none';
export type FilterLabels = {
  [labelName: string]: string | string[],
  selectors?: string[],
};

// Note that `summary` and `runbook_url` are optional in alert annotations.
export type Alert = {
  id: string,
  description: string,
  startsAt: string,
  endsAt: string,
  severity: string,
  labels: AlertLabels,
  originalAlert: PrometheusAlert,
  summary?: string,
  documentationUrl?: string,
  childrenJsonPath?: string,
};

// Return boolean if the two alerts have the same labels but different severity
const isSameAlertWithDiffSeverity = (
  alert1: AlertLabels,
  alert2: AlertLabels,
): boolean => {
  // filter out the `severity` property
  function replacer(key, value) {
    if (key === 'severity') {
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
  const len = alerts.length;
  const removeIndex = [];
  for (let i = 0; i < len - 1; i++) {
    for (let j = i + 1; j < len; j++) {
      if (isSameAlertWithDiffSeverity(alerts[i].labels, alerts[j].labels)) {
        if (alerts[i].labels.severity === STATUS_WARNING) {
          removeIndex.push(i);
        } else if (alerts[j].labels.severity === STATUS_WARNING) {
          removeIndex.push(j);
        }
      }
    }
  }

  let removedWarningAlerts = [...alerts];
  removeIndex.forEach((index) => removedWarningAlerts.splice(index, 1));

  return removedWarningAlerts;
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
        selectors:
          (alert.annotations.selectors &&
            alert.annotations.selectors.split(',')) ||
          [],
      },
      childrenJsonPath: alert.annotations && alert.annotations.childrenJsonPath,
      originalAlert: alert,
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
            filters[key].find((val) => {
              // already check if !labels[key] return false
              //$FlowFixMe
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
    return isAlertSelected(alert.labels, filters);
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
  activeOn?: string = new Date().toISOString(),
): Health => {
  if (!alerts || !alerts.length) return STATUS_HEALTH;

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
  return STATUS_NONE;
};

/*
Format the alerts from Loki.
We need to remove the alerts with the same fingerprint and starts date, because the same alert may be retriggered by multiple times.
*/
export const formatHistoryAlerts = (streamValues: StreamValue): Alert[] => {
  const alerts = streamValues
    .map((streamValue) => streamValue.values)
    .reduce((agg, value) => [...agg, ...value], [])
    .reduce((agg, value) => {
      const alert = JSON.parse(value[1]);

      return {
        ...agg,
        [`${alert.fingerprint}-${alert.startsAt}`]: {
          id: alert.fingerprint,
          summary: (alert.annotations && alert.annotations.summary) || '',
          description:
            alert.annotations.description || alert.annotations.message,
          startsAt: alert.startsAt,
          endsAt: alert.status === 'firing' ? null : alert.endsAt,
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
  //$flow-disable-line Array<mixed> incompatible with Alert[];
  return Object.values(alerts || {});
};

// recursively to get all the atomic alerts in the build alert tree relate to MetalK8s
export const getChildrenAlerts = (
  jsonPaths: string[], // children json path, the first one should be the clusterDegarded or clusterAtRisk
  allAlerts: Alert[],
) => {
  if (!jsonPaths.length) return [];
  const nodeAlerts = jsonPaths.flatMap((jsonPath) => {
    if (jsonPath) {
      return jp.query(allAlerts, jsonPath);
    }
    return [];
  });
  const jsonPathArr = [];
  nodeAlerts.forEach((alert) => {
    if (alert.childrenJsonPath) {
      jsonPathArr.push(alert.childrenJsonPath);
    }
  });
  // filter out the logical alerts
  const atomicAlerts = nodeAlerts.filter((alert) => !alert.childrenJsonPath);
  return [...atomicAlerts, ...getChildrenAlerts(jsonPathArr, allAlerts)];
};
