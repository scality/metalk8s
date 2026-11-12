import ApiClient from '../../services/ApiClient';
import { unreadable } from '../monitoringTools';
import type { MetalK8sSelfConfiguration, ToolContext } from '../types';

type QueryParams = { query: string; range?: { minutes: number; step?: string } };

/**
 * READ-ONLY: one PromQL query against the platform's Prometheus, answered with Prometheus's own JSON.
 *
 * Nothing is reshaped. Values stay strings and timestamps stay float seconds: a reshaping layer is
 * somewhere a bug can quietly misstate the cluster, and the model reads Prometheus's format as it is.
 * Which query to run, and what the answer means, is the model's job.
 *
 * It builds its own client from the configured URL and the caller's token rather than using the
 * app's shared one: that one is only initialised once the MetalK8s pages themselves have mounted,
 * and a tool can be called from any app's page.
 */
export function createMakePrometheusQueryTool(context: ToolContext) {
  return {
    name: 'makePrometheusQuery',
    description:
      "Runs one PromQL query against the platform's Prometheus and returns Prometheus's own JSON, " +
      'untouched.\n' +
      'Without range it is an instant query, evaluated now (resultType "vector"). With range it ' +
      'covers the last range.minutes up to now (resultType "matrix").\n' +
      'Values are strings and timestamps are seconds, as Prometheus sends them.\n' +
      'A query Prometheus rejects comes back as its own error — { status: "error", errorType, ' +
      'error } — so fix the query and try again.\n' +
      'An empty result means no series matched: the metric may not exist under that name, or has ' +
      'no data in that window. It does NOT mean the value is zero.\n' +
      'not_authorized means you could not look — never report that as "nothing is wrong".',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The PromQL expression.' },
        range: {
          type: 'object',
          description: 'Leave out for the value now. Give it to see how the value moved over time.',
          properties: {
            minutes: { type: 'integer', minimum: 1, description: 'How far back from now.' },
            step: {
              type: 'string',
              description: 'The resolution, as Prometheus takes it ("30s", "5m"). Defaults to about 200 points.',
            },
          },
          required: ['minutes'],
        },
      },
      required: ['query'],
    },
    annotations: { readOnlyHint: true },

    execute: async ({ query, range }: QueryParams) => {
      const { url_prometheus } = (context.selfConfiguration ?? {}) as MetalK8sSelfConfiguration;
      if (!url_prometheus) {
        return { status: 'unavailable', message: 'This deployment does not expose Prometheus.' };
      }

      const token = await context.getToken();
      if (!token) return unreadable('Prometheus', 401);

      const prometheus = new ApiClient({ apiUrl: url_prometheus, headers: { Authorization: `Bearer ${token}` } });
      const now = Math.floor(Date.now() / 1000);

      // query_range requires a step; without one asked for, about 200 points over the window.
      const response = range
        ? await prometheus.get('/api/v1/query_range', {
            query,
            start: now - range.minutes * 60,
            end: now,
            step: range.step ?? Math.max(15, Math.ceil((range.minutes * 60) / 200)),
          })
        : await prometheus.get('/api/v1/query', { query });

      // ApiClient answers { error } instead of throwing. A query Prometheus refused carries its own
      // explanation in the body, which is what the model needs to fix it.
      if (response?.error) {
        const { status, data } = response.error.response ?? {};
        return data?.status === 'error' ? data : unreadable('Prometheus', status);
      }
      return response;
    },
  };
}
