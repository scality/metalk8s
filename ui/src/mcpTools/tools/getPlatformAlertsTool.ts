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
export function createGetPlatformAlertsTool(context: ToolContext) {
  return {
    name: 'getPlatformAlerts',
    description:
      "Returns the platform's active alerts — the same list, in the same order, as the alert page.\n" +
      'Call it when the user asks what is wrong, what is alerting, or about an alert without ' +
      'giving its id.\n' +
      'Each alert has id, severity, alertname, description and startsAt (when it started firing).\n' +
      'An empty list means nothing is firing. Any other status means you could not look — never ' +
      'report that as "no alerts".',
    inputSchema: { type: 'object', properties: {}, required: [] },
    annotations: { readOnlyHint: true },

    execute: async () => {
      const result = readAlerts(context);
      if ('refusal' in result) return result.refusal;

      return {
        status: 'ok',
        alerts: result.alerts.map((alert) => ({
          id: alert.id,
          severity: alert.severity,
          alertname: alert.labels.alertname,
          description: alert.description || alert.summary,
          startsAt: alert.startsAt,
        })),
      };
    },
  };
}
