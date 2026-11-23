import ApiClient from '../../services/ApiClient';
import { unreadable } from '../monitoringTools';
import type { MetalK8sSelfConfiguration, ToolContext } from '../types';

type QueryParams = { query: string; range?: { start: string; end?: string; step?: string } };

/** A time as Prometheus takes it — RFC 3339 or unix seconds — in seconds, or NaN when it is neither. */
const toSeconds = (time: string) =>
  /^\d+(\.\d+)?$/.test(time) ? Number(time) : /(Z|[+-]\d{2}:\d{2})$/i.test(time) ? Date.parse(time) / 1000 : NaN;

/**
 * How many series one answer carries. A broad query — `kube_pod_info` is 1,180 series and about
 * 600 KB on a lab cluster — would push the investigation out of the model's context. The rest stays
 * reachable by narrowing the query itself, which is also the better question to ask.
 */
const MAX_SERIES = 100;

/**
 * READ-ONLY: one PromQL query against the platform's Prometheus, answered with Prometheus's own JSON.
 *
 * Nothing is reshaped beyond the series cap. Values stay strings and timestamps stay float seconds: a reshaping layer is
 * somewhere a bug can quietly misstate the cluster, and the model reads Prometheus's format as it is.
 * Which query to run, and what the answer means, is the model's job.
 *
 * It builds its own client from the configured URL and the caller's token rather than using the
 * app's shared one: that one is only initialised once the MetalK8s pages themselves have mounted,
 * and a tool can be called from any app's page.
 */
export function createExecutePrometheusQueryTool(context: ToolContext) {
  return {
    name: 'executePrometheusQuery',
    description:
      "Runs one PromQL query against the platform's Prometheus and returns Prometheus's own JSON, " +
      'untouched.\n' +
      'Without range it is an instant query, evaluated now (resultType "vector"). With range it ' +
      'covers range.start to range.end (resultType "matrix"): take the times from what you read — ' +
      "an alert's startsAt, a log or event timestamp. end defaults to now.\n" +
      'Values are strings and timestamps are seconds, as Prometheus sends them.\n' +
      'A query Prometheus rejects comes back as its own error — { status: "error", errorType, ' +
      'error } — so fix the query and try again.\n' +
      `At most ${MAX_SERIES} series come back: truncated means totalSeries matched and only the ` +
      'first ones are listed. Narrow the query rather than asking again: filter on a label inside it ' +
      '({namespace="…"}, values from getPrometheusMetrics with metric), keep the highest with ' +
      'topk(10, …), or aggregate with sum by (…).\n' +
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
            start: {
              type: 'string',
              description:
                'Where the window starts, as Prometheus takes it: RFC 3339 ("2026-11-18T20:25:02Z") or unix seconds.',
            },
            end: { type: 'string', description: 'Where it ends, in the same forms. Defaults to now.' },
            step: {
              type: 'string',
              description: 'The resolution, as Prometheus takes it ("30s", "5m"). Defaults to about 200 points.',
            },
          },
          required: ['start'],
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

      // The window is checked before anything is sent: a date Prometheus cannot read would come back
      // as its own error, but the default step needs the window's length first.
      let window: { start: number; end: number } | undefined;
      if (range) {
        const start = toSeconds(String(range.start ?? ''));
        const end = range.end ? toSeconds(String(range.end)) : Math.floor(Date.now() / 1000);
        if (!Number.isFinite(start) || !Number.isFinite(end)) {
          return {
            status: 'malformed',
            message: 'range.start and range.end are RFC 3339 dates ("2026-11-18T20:25:02Z") or unix seconds.',
          };
        }
        if (start >= end) {
          return {
            status: 'malformed',
            message: 'range.start has to be before range.end (now, when end is left out).',
          };
        }
        window = { start, end };
      }

      const token = await context.getToken();
      if (!token) return unreadable('Prometheus', 401);

      const prometheus = new ApiClient({ apiUrl: url_prometheus, headers: { Authorization: `Bearer ${token}` } });

      // query_range requires a step; without one asked for, about 200 points over the window.
      const response = window
        ? await prometheus.get('/api/v1/query_range', {
            query,
            start: window.start,
            end: window.end,
            step: range?.step ?? Math.max(15, Math.ceil((window.end - window.start) / 200)),
          })
        : await prometheus.get('/api/v1/query', { query });

      // ApiClient answers { error } instead of throwing. A query Prometheus refused carries its own
      // explanation in the body, which is what the model needs to fix it.
      if (response?.error) {
        const { status, data } = response.error.response ?? {};
        return data?.status === 'error' ? data : unreadable('Prometheus', status);
      }
      const result = response?.data?.result;
      if (Array.isArray(result) && result.length > MAX_SERIES) {
        return {
          ...response,
          data: { ...response.data, result: result.slice(0, MAX_SERIES) },
          truncated: true,
          totalSeries: result.length,
          message:
            `Showing the first ${MAX_SERIES} of ${result.length} series. Narrow the query: filter on a ` +
            'label inside it, keep the highest with topk(10, …), or aggregate with sum by (…).',
        };
      }
      return response;
    },
  };
}
