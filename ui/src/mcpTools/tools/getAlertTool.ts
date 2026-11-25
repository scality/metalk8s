import { readAlerts } from '../monitoringTools';
import type { ToolContext } from '../types';

/** The PromQL of the rule that fired, which Prometheus puts in the generatorURL as `g0.expr`. */
const ruleExpression = (generatorURL?: string) => {
  try {
    return new URL(generatorURL ?? '').searchParams.get('g0.expr') ?? undefined;
  } catch {
    return undefined;
  }
};

/**
 * READ-ONLY: everything Alertmanager holds about ONE active alert, as it holds it.
 *
 * getAlerts is the list; this is the detail behind one row, from the same cache. Each cached
 * alert keeps Alertmanager's own object as originalAlert, and that is what comes back: every label,
 * every annotation, whether it is silenced or inhibited, and the generatorURL that carries the rule
 * which fired it.
 *
 * That rule also comes back decoded, as `expr`: the generatorURL points at Prometheus's address
 * inside the cluster, which the model cannot open, and its PromQL is only readable once decoded.
 */
export function createGetAlertTool(context: ToolContext) {
  return {
    name: 'getAlert',
    description:
      'Returns everything Alertmanager holds about ONE active alert, by its id: labels, ' +
      'annotations, startsAt and endsAt, status (silencedBy, inhibitedBy) and generatorURL — the ' +
      'link to the PromQL rule that fired it.\n' +
      'expr is that rule, decoded: you can run it, when needed, with executePrometheusQuery to see which series fire and ' +
      'with what value, and search its metric names with getPrometheusMetrics when needed.\n' +
      'The id comes from getAlerts.\n' +
      'not_found means no active alert has that id: it has resolved, or the id is wrong. Any other ' +
      'status means you could not look — never report that as the alert being gone.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: "The alert's id, as getAlerts returns it." } },
      required: ['id'],
    },
    annotations: { readOnlyHint: true },

    execute: async ({ id }: { id: string }) => {
      const result = readAlerts(context);
      if ('refusal' in result) return result.refusal;

      const alert = result.alerts.find((a) => a.id === id);
      if (!alert) {
        return {
          status: 'not_found',
          message: `No active alert has the id "${id}". It has resolved, or the id is wrong — getAlerts lists the current ones.`,
        };
      }
      const expr = ruleExpression(alert.originalAlert.generatorURL);
      return { status: 'ok', ...(expr ? { expr } : {}), alert: alert.originalAlert };
    },
  };
}
