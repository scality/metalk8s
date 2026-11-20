import ApiClient from '../../services/ApiClient';
import { unreadable } from '../monitoringTools';
import type { MetalK8sSelfConfiguration, ToolContext } from '../types';

/** What `/api/v1/metadata` answers: per metric name, what each exporter says about it. */
type Metadata = Record<string, { type: string; unit: string; help: string }[]>;

/** Metadata changes only when an exporter comes or goes. */
const METADATA_STALE_MS = 10 * 60 * 1000;

/** Thrown inside the queryFn so that a failure is never cached as an empty list. */
class PrometheusFailure extends Error {
  constructor(readonly httpStatus?: number) {
    super(`Prometheus answered ${httpStatus ?? 'nothing'}`);
  }
}

/**
 * Every metric the platform's Prometheus has metadata for, read once and shared.
 *
 * On a lab cluster this is about 11,000 metrics and 2 MB: the browser holds it, the model only ever
 * gets the prefixes or the matches.
 */
const readMetadata = (context: ToolContext, url: string) =>
  context.queryClient.fetchQuery(
    ['prometheusMetadata', url],
    async () => {
      const token = await context.getToken();
      if (!token) throw new PrometheusFailure(401);

      const prometheus = new ApiClient({ apiUrl: url, headers: { Authorization: `Bearer ${token}` } });
      const response = await prometheus.get('/api/v1/metadata');
      // ApiClient answers { error } instead of throwing.
      if (response?.error) throw new PrometheusFailure(response.error.response?.status);
      return (response?.data ?? {}) as Metadata;
    },
    { staleTime: METADATA_STALE_MS, retry: false },
  );

/** The first word of each name, and how many metrics share it, largest first. */
const prefixesOf = (names: string[]) => {
  const counts = new Map<string, number>();
  for (const name of names) {
    const prefix = name.split('_')[0];
    counts.set(prefix, (counts.get(prefix) ?? 0) + 1);
  }
  return [...counts]
    .map(([prefix, count]) => ({ prefix, count }))
    .sort((a, b) => b.count - a.count || a.prefix.localeCompare(b.prefix));
};

/** How many values of one label come back; `count` says how many there are. */
const MAX_LABEL_VALUES = 20;

/** Labels are read over the last hour, so a pod long gone does not come back as a value. */
const LABELS_WINDOW_S = 60 * 60;

/** A metric name as PromQL takes it: the name goes into a query, so nothing else is accepted. */
const METRIC_NAME = /^[a-zA-Z_:][a-zA-Z0-9_:]*$/;

/**
 * One metric's labels and their values, and how many series it has now.
 *
 * Label by label rather than through `/api/v1/series`: one metric can have thousands of series (2 MB
 * for container_memory_working_set_bytes on a lab cluster), while its label names and each label's
 * values are a few kilobytes.
 */
const readLabels = async (context: ToolContext, url: string, metric: string) => {
  const token = await context.getToken();
  if (!token) throw new PrometheusFailure(401);

  const prometheus = new ApiClient({ apiUrl: url, headers: { Authorization: `Bearer ${token}` } });
  const get = async (endpoint: string, params: Record<string, unknown>) => {
    const response = await prometheus.get(endpoint, params);
    if (response?.error) throw new PrometheusFailure(response.error.response?.status);
    return response?.data;
  };
  const end = Math.floor(Date.now() / 1000);
  const window = { 'match[]': metric, start: end - LABELS_WINDOW_S, end };

  const [counted, names] = await Promise.all([
    get('/api/v1/query', { query: `count(${metric})` }),
    get('/api/v1/labels', window),
  ]);
  const labels = await Promise.all(
    ((names ?? []) as string[])
      .filter((name) => name !== '__name__')
      .map(async (name) => {
        const values = ((await get(`/api/v1/label/${encodeURIComponent(name)}/values`, window)) ?? []) as string[];
        return { name, count: values.length, values: values.slice(0, MAX_LABEL_VALUES) };
      }),
  );
  return { series: Number(counted?.result?.[0]?.value?.[1] ?? 0), labels };
};

/**
 * READ-ONLY: which metrics the platform's Prometheus holds, so PromQL is written with real names and
 * filtered on real label values.
 *
 * A wrong metric name or label value is not an error in PromQL: it returns an empty result, which
 * reads as "no data". This is what the model checks them against before it queries.
 */
export function createGetPrometheusMetricsTool(context: ToolContext) {
  return {
    name: 'getPrometheusMetrics',
    description:
      "call this tool when being asked to lists the metrics the platform's Prometheus holds, so you query real names instead of " +
      'guessing them: a wrong name returns an empty result, not an error.\n' +
      'Without search, returns this cluster\'s metric prefixes (the first word of each name: "node", ' +
      '"kube", "etcd"…) with how many metrics each holds. With search, returns every metric whose ' +
      'name contains all the words, with its type (counter, gauge, histogram, summary) and its help. ' +
      "With metric, returns that one metric's labels and their values, and how many series it has.\n" +
      'The order to follow: search to find the metric, metric to see its labels, then ' +
      "executePrometheusQuery filtered on those labels' real values. To diagnose an alert, start " +
      "from the metric names in getAlert's expr.\n" +
      'Metrics made by recording rules (names with a colon) are not listed by search: pass them as ' +
      'metric.\n' +
      'count 0 means no name contains those words — try fewer words, or no search. series 0 means ' +
      'the metric has no data right now, not that its value is zero. not_authorized means you ' +
      'could not look — never report that as "no such metric".',
    inputSchema: {
      type: 'object',
      properties: {
        search: {
          type: 'string',
          description:
            'Words from a metric name, such as those in an alert\'s expr ("node_filesystem"). Leave ' +
            'it out to get this cluster\'s metric prefixes ("node", "kube", "etcd"…) with their ' +
            'counts, then search one of them. A prefix with thousands of metrics needs more words.',
        },
        metric: {
          type: 'string',
          description:
            'One exact metric name, from a search or an expr. Returns its labels with their values ' +
            `over the last hour (at most ${MAX_LABEL_VALUES} each; count says how many there are), ` +
            'so your query filters on values that exist. Takes precedence over search.',
        },
      },
      required: [],
    },
    annotations: { readOnlyHint: true },

    execute: async ({ search, metric }: { search?: string; metric?: string }) => {
      const { url_prometheus } = (context.selfConfiguration ?? {}) as MetalK8sSelfConfiguration;
      if (!url_prometheus) {
        return { status: 'unavailable', message: 'This deployment does not expose Prometheus.' };
      }
      if (metric !== undefined && !METRIC_NAME.test(metric)) {
        return {
          status: 'malformed',
          message: `"${metric}" is not a metric name. Pass one name exactly as a search returned it.`,
        };
      }

      let metadata: Metadata;
      try {
        metadata = await readMetadata(context, url_prometheus);
      } catch (error) {
        return unreadable('Prometheus', (error as PrometheusFailure).httpStatus);
      }

      if (metric) {
        let read: Awaited<ReturnType<typeof readLabels>>;
        try {
          read = await readLabels(context, url_prometheus, metric);
        } catch (error) {
          return unreadable('Prometheus', (error as PrometheusFailure).httpStatus);
        }
        // A recording rule has no metadata, and still has labels.
        const { type, help } = metadata[metric]?.[0] ?? { type: 'unknown', help: '' };
        // With no series, what the labels endpoint still answers is the labels the proxy adds to
        // every answer (prometheus, prometheus_replica…), for any name, real or not: not this metric's.
        if (!read.series) {
          return {
            status: 'ok',
            metric,
            type,
            help,
            series: 0,
            labels: [],
            message: metadata[metric]
              ? `Prometheus knows ${metric} but holds no data for it right now. That is not a value of zero.`
              : `No metric is named "${metric}". Search for it to get its exact name.`,
          };
        }
        return { status: 'ok', metric, type, help, ...read };
      }

      const words = (search ?? '').toLowerCase().split(/\s+/).filter(Boolean);
      if (!words.length) {
        const prefixes = prefixesOf(Object.keys(metadata));
        return { status: 'ok', count: prefixes.length, prefixes };
      }

      const metrics = Object.keys(metadata)
        .filter((name) => words.every((word) => name.toLowerCase().includes(word)))
        .sort()
        .map((name) => {
          // An exporter can describe the same name twice; the first description is enough.
          const { type, unit, help } = metadata[name][0] ?? { type: 'unknown', unit: '', help: '' };
          return { name, type, unit, help };
        });

      if (!metrics.length) {
        return {
          status: 'ok',
          search,
          count: 0,
          metrics,
          message: `No metric name contains every word of "${search}". Try fewer words, or call without search to see the prefixes.`,
        };
      }
      return { status: 'ok', search, count: metrics.length, metrics };
    },
  };
}
