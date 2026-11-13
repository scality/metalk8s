import type { Alert } from '../../services/alertUtils';
import { readAlerts } from '../monitoringTools';
import type { ToolContext } from '../types';

/**
 * READ-ONLY: the platform's active alerts — the list the alert page shows, in its order.
 *
 * Read from the console's own alert cache, so it is not a copy of the page's list but that list:
 * already formatted, stripped of the warnings a critical twin covers, and sorted by severity. "The
 * second alert" means the same thing to the agent and to the user.
 *
 * Each field is a column of the alert page, read the way the page reads it. `description` is the
 * page's Description column — `row.description || row.summary` in AlertPage — because an alert can
 * carry a description and no summary at all, and a summary alone would leave those blank.
 */
/**
 * The alerts as the page lists them: leaves only, in the page's columns.
 *
 * The same `children` filter AlertPage and AlertNavbarUpdater apply. The cache also holds the
 * parent alerts lib-alert-tree builds (PlatformDegraded and the like), which appear on no page —
 * so without this the agent counts alerts the user cannot see, and "the second alert" means two
 * different rows.
 */
const leaves = (alerts: Alert[]) =>
  alerts
    .filter((alert) => !alert.labels.children)
    .map((alert) => ({
      id: alert.id,
      severity: alert.severity,
      alertname: alert.labels.alertname,
      description: alert.description || alert.summary,
      startsAt: alert.startsAt,
    }));

export function createGetAlertsTool(context: ToolContext) {
  return {
    name: 'getAlerts',
    description:
      "Returns the platform's active alerts — the same list, in the same order, as the alert page.\n" +
      'Call it when the user asks what is wrong, what is alerting, or about an alert without ' +
      'giving its id.\n' +
      'Each alert has id, severity, alertname, description and startsAt (when it started firing).\n' +
      'An EMPTY list is not good news: it comes back with `alertingPipelineSuspect` and a reason. ' +
      'Report it the way that field says, never as "everything is fine".\n' +
      'Any other status means you could not look — never report that as "no alerts" either.',
    inputSchema: { type: 'object', properties: {}, required: [] },
    annotations: { readOnlyHint: true },

    execute: async () => {
      const result = readAlerts(context);
      if ('refusal' in result) return result.refusal;

      const alerts = leaves(result.alerts);

      // An empty list is not a healthy platform. Watchdog fires permanently and for no other
      // reason than to prove the alerting pipeline works (`expr: vector(1)`, severity none), so it
      // is in this list on any platform that can report at all. Nothing at all therefore says
      // Prometheus or Alertmanager has stopped reporting, which is the opposite of what "no
      // alerts" sounds like — and it is the state in which nothing would warn the user anyway.
      if (!alerts.some((alert) => alert.alertname === 'Watchdog')) {
        return {
          status: 'ok',
          alerts,
          alertingPipelineSuspect:
            'No alert at all, not even Watchdog — the alert that fires permanently to prove the ' +
            'alerting pipeline works. That usually means Prometheus or Alertmanager has stopped ' +
            'reporting rather than that the platform is healthy, and nothing would raise an alarm ' +
            'while it lasts. Say so, and offer to look into why the alerting service is down.',
        };
      }

      return {
        status: 'ok',
        alerts,
      };
    },
  };
}
