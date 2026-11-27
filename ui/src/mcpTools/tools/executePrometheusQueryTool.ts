import ApiClient from '../../services/ApiClient';
import { unreadable } from '../monitoringTools';
import type { MetalK8sSelfConfiguration, ToolContext } from '../types';

type QueryParams = { query: string; range?: { start: string; end?: string; step?: string } };

/** A time as Prometheus takes it — RFC 3339 or unix seconds — in seconds, or NaN when it is neither. */
const toSeconds = (time: string) =>
  /^\d+(\.\d+)?$/.test(time) ? Number(time) : /(Z|[+-]\d{2}:\d{2})$/i.test(time) ? Date.parse(time) / 1000 : NaN;

const DURATION_UNITS: Record<string, number> = { ms: 0.001, s: 1, m: 60, h: 3600, d: 86400, w: 604800, y: 31536000 };

/** A step as Prometheus takes it — seconds ("30") or a duration ("30s", "1h30m") — in seconds, or NaN. */
const stepSeconds = (step: string): number => {
  if (/^\d+(\.\d+)?$/.test(step)) return Number(step);
  if (!/^(\d+(ms|s|m|h|d|w|y))+$/.test(step)) return NaN;
  let total = 0;
  const parts: string[] = step.match(/\d+(?:ms|s|m|h|d|w|y)/g) ?? [];
  for (const part of parts) {
    const [, amount, unit] = part.match(/^(\d+)(ms|s|m|h|d|w|y)$/) ?? [];
    total += Number(amount) * DURATION_UNITS[unit];
  }
  return total;
};

/**
 * How many points one series carries over a window, at most. The step follows the window: a short
 * window keeps its detail, a long one becomes a trend, and an answer never grows with the window.
 */
const MAX_POINTS = 200;

/**
 * How large an answer reaches the model, at most. The step bounds the points of each series, not
 * how many series a query matches: a namespace's containers over an hour were 148 series and 800 KB
 * on a lab cluster. Past this, nothing is returned but what to narrow, rather than a truncated answer
 * the model could read as complete.
 */
const MAX_ANSWER_BYTES = 400 * 1024;

/** No finer than this by default: Prometheus scrapes every 15 to 30 seconds, so a finer step repeats. */
const MIN_DEFAULT_STEP_S = 15;

/**
 * READ-ONLY: one PromQL query against the platform's Prometheus, answered with Prometheus's own JSON.
 *
 * Nothing is reshaped. Values stay strings and timestamps stay float seconds: a reshaping layer is
 * somewhere a bug can quietly misstate the cluster, and the model reads Prometheus's format as it is.
 * Which query to run, and what the answer means, is the model's job. What bounds the answer is the
 * step, which never goes below the window divided by MAX_POINTS.
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
      `A series carries at most about ${MAX_POINTS} points: the step is at least the window divided ` +
      `by ${MAX_POINTS}, and a finer step asked for is raised — step then says which was used. Ask a ` +
      'short window for detail, a long one for the trend.\n' +
      'A metric with many series (one per pod, container, disk) answers with all of them, up to about ' +
      `${MAX_ANSWER_BYTES / 1024} KB. Past that it answers too_broad, with no data: varies says which ` +
      'labels differ between the series — filter on one inside the query ({label="value"}), keep the ' +
      'highest with topk(10, …), aggregate with sum by (…), or ask a longer step.\n' +
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
            start: {
              type: 'string',
              description:
                'Where the window starts, as Prometheus takes it: RFC 3339 ("2026-11-18T20:25:02Z") or unix seconds.',
            },
            end: { type: 'string', description: 'Where it ends, in the same forms. Defaults to now.' },
            step: {
              type: 'string',
              description: `The resolution, as Prometheus takes it ("30s", "5m"). Defaults to about ${MAX_POINTS} points; never finer than that.`,
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

      // The window is checked before anything is sent: the step depends on its length.
      let window: { start: number; end: number; step: number; asked?: string } | undefined;
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
        const finest = Math.ceil((end - start) / MAX_POINTS);
        const asked = range.step === undefined ? undefined : stepSeconds(String(range.step));
        if (asked !== undefined && !(asked > 0)) {
          return { status: 'malformed', message: 'range.step is a duration ("30s", "5m", "1h30m") or seconds.' };
        }
        window = {
          start,
          end,
          step: asked === undefined ? Math.max(MIN_DEFAULT_STEP_S, finest) : Math.max(asked, finest),
          asked: asked !== undefined && asked < finest ? String(range.step) : undefined,
        };
      }

      const token = await context.getToken();
      if (!token) return unreadable('Prometheus', 401);

      const prometheus = new ApiClient({ apiUrl: url_prometheus, headers: { Authorization: `Bearer ${token}` } });

      const response = window
        ? await prometheus.get('/api/v1/query_range', {
            query,
            start: window.start,
            end: window.end,
            step: window.step,
          })
        : await prometheus.get('/api/v1/query', { query });

      // ApiClient answers { error } instead of throwing. A query Prometheus refused carries its own
      // explanation in the body, which is what the model needs to fix it.
      if (response?.error) {
        const { status, data } = response.error.response ?? {};
        return data?.status === 'error' ? data : unreadable('Prometheus', status);
      }
      const result = response?.data?.result;
      const bytes = JSON.stringify(response ?? null).length;
      if (Array.isArray(result) && bytes > MAX_ANSWER_BYTES) {
        // Which labels tell the series apart, most values first: what a filter or a `by` would use.
        // The metric name counts too: a query can match several metrics.
        const values = new Map<string, Set<string>>();
        for (const { metric } of result as { metric?: Record<string, string> }[]) {
          for (const [label, value] of Object.entries(metric ?? {})) {
            if (!values.has(label)) values.set(label, new Set());
            values.get(label)?.add(value);
          }
        }
        const varies = Object.fromEntries(
          [...values]
            .filter(([, seen]) => seen.size > 1)
            .map(([label, seen]) => [label, seen.size] as const)
            .sort((a, b) => b[1] - a[1]),
        );
        const points = (result as { values?: unknown[] }[]).reduce((max, series) => Math.max(max, series.values?.length ?? 1), 1);
        const [mostVaried] = Object.keys(varies);
        const narrowings = [
          ...(mostVaried ? [`filter on a label that varies ({${mostVaried}="…"})`] : []),
          'keep the highest with topk(10, …)',
          'aggregate with sum by (…)',
          ...(window ? ['ask a longer step'] : []),
        ];
        return {
          status: 'too_broad',
          series: result.length,
          pointsPerSeries: points,
          sizeKB: Math.round(bytes / 1024),
          varies,
          message:
            `${result.length} series × ${points} points (${Math.round(bytes / 1024)} KB) is more than one ` +
            `answer can carry. Narrow the query: ${narrowings.join(', ')}.`,
        };
      }
      if (window?.asked) {
        return {
          ...response,
          step: `${window.step}s`,
          message:
            `The step was raised from ${window.asked} to ${window.step}s: at most ${MAX_POINTS} points ` +
            'per series over this window. Ask a shorter window for more detail.',
        };
      }
      return response;
    },
  };
}
