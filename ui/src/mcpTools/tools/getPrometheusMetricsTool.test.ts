import axios from 'axios';
import { QueryClient } from 'react-query';
import type { ToolContext } from '../types';
import { createGetPrometheusMetricsTool } from './getPrometheusMetricsTool';

jest.mock('axios');

const makeContext = (overrides: Partial<ToolContext> = {}): ToolContext =>
  ({
    getToken: jest.fn().mockResolvedValue('a-fresh-token'),
    userData: undefined,
    selfConfiguration: { url: '/api/kubernetes', url_prometheus: '/api/prometheus' },
    queryClient: new QueryClient(),
    ...overrides,
  }) as ToolContext;

const run = (params: { search?: string; metric?: string }, context = makeContext()) =>
  createGetPrometheusMetricsTool(context).execute(params) as Promise<Record<string, unknown>>;

const METADATA = {
  status: 'success',
  data: {
    node_filesystem_avail_bytes: [
      { type: 'gauge', unit: '', help: 'Filesystem space available to non-root users in bytes.' },
    ],
    node_filesystem_size_bytes: [{ type: 'gauge', unit: '', help: 'Filesystem size in bytes.' }],
    node_load1: [{ type: 'gauge', unit: '', help: '1m load average.' }],
    etcd_server_has_leader: [
      { type: 'gauge', unit: '', help: 'Whether or not a leader exists. 1 is existence, 0 is not.' },
    ],
    scuba_requests_total: [{ type: 'counter', unit: '', help: 'Requests served.' }],
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  (axios as unknown as jest.Mock).mockResolvedValue({ data: METADATA });
});

describe('getPrometheusMetrics', () => {
  it('is declared read-only', () => {
    expect(createGetPrometheusMetricsTool(makeContext()).annotations).toEqual({ readOnlyHint: true });
  });

  it("lists this cluster's metric prefixes with their counts, largest first, without search", async () => {
    const result = await run({});

    expect(result).toEqual({
      status: 'ok',
      count: 3,
      prefixes: [
        { prefix: 'node', count: 3 },
        { prefix: 'etcd', count: 1 },
        { prefix: 'scuba', count: 1 },
      ],
    });
    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: '/api/prometheus',
        url: '/api/v1/metadata',
        headers: { Authorization: 'Bearer a-fresh-token' },
      }),
    );
  });

  it('treats a blank search as no search', async () => {
    expect(await run({ search: '   ' })).toMatchObject({ count: 3, prefixes: expect.any(Array) });
  });

  it('returns every metric whose name contains all the words, with its type and help', async () => {
    const result = await run({ search: 'Filesystem node' });

    expect(result).toEqual({
      status: 'ok',
      search: 'Filesystem node',
      count: 2,
      metrics: [
        {
          name: 'node_filesystem_avail_bytes',
          type: 'gauge',
          unit: '',
          help: 'Filesystem space available to non-root users in bytes.',
        },
        { name: 'node_filesystem_size_bytes', type: 'gauge', unit: '', help: 'Filesystem size in bytes.' },
      ],
    });
  });

  it('matches names only, not the help text', async () => {
    // "leader" is in etcd_server_has_leader's name; "existence" is only in its help.
    expect((await run({ search: 'leader' })).count).toBe(1);
    expect((await run({ search: 'existence' })).count).toBe(0);
  });

  it('says what to try when nothing matches, rather than an empty answer', async () => {
    const result = await run({ search: 'filesystem etcd' });

    expect(result).toMatchObject({ status: 'ok', count: 0, metrics: [] });
    expect(result.message).toMatch(/without search/);
  });

  it('reads the metadata once and answers later calls from the shared cache', async () => {
    const context = makeContext();

    await run({}, context);
    await run({ search: 'node' }, context);

    expect(axios).toHaveBeenCalledTimes(1);
  });

  it('says it could not look, rather than "no such metric", when not allowed', async () => {
    (axios as unknown as jest.Mock).mockRejectedValue({ response: { status: 403, data: 'Forbidden' } });
    expect((await run({ search: 'node' })).status).toBe('not_authorized');
  });

  it('does not keep a failure in the cache: the next call asks Prometheus again', async () => {
    const context = makeContext();
    (axios as unknown as jest.Mock).mockRejectedValueOnce({ response: { status: 503 } });

    expect((await run({}, context)).status).toBe('unavailable');
    expect((await run({}, context)).status).toBe('ok');
  });

  it('asks the user to sign in again when there is no token', async () => {
    const result = await run({}, makeContext({ getToken: jest.fn().mockResolvedValue(null) }));
    expect(result.status).toBe('session_expired');
    expect(axios).not.toHaveBeenCalled();
  });

  it('is unavailable when the deployment exposes no Prometheus', async () => {
    const result = await run({}, makeContext({ selfConfiguration: { url: '/api/kubernetes' } }));
    expect(result.status).toBe('unavailable');
    expect(axios).not.toHaveBeenCalled();
  });

  it('lists the first 100 matches of a broad search, with the real count and how to narrow it', async () => {
    const data = Object.fromEntries(
      Array.from({ length: 150 }, (_, i) => [
        `mongodb_metric_${String(i).padStart(3, '0')}`,
        [{ type: 'gauge', unit: '', help: `Metric ${i}.` }],
      ]),
    );
    (axios as unknown as jest.Mock).mockResolvedValue({ data: { status: 'success', data } });

    const result = await run({ search: 'mongodb' });

    expect(result).toMatchObject({ status: 'ok', count: 150, truncated: true });
    expect(result.metrics).toHaveLength(100);
    expect((result.metrics as { name: string }[])[0].name).toBe('mongodb_metric_000');
    expect(result.message).toMatch(/first 100 of 150.*Add words/);
  });

  it('does not mark a search that fits as truncated', async () => {
    expect(await run({ search: 'node' })).not.toHaveProperty('truncated');
  });

  it('keeps the metadata cached for as long as it is fresh, though no component observes it', async () => {
    const context = makeContext();
    await run({}, context);

    const query = context.queryClient.getQueryCache().find(['prometheusMetadata', '/api/prometheus']);
    expect(query?.cacheTime).toBe(10 * 60 * 1000);
  });

  it('treats an empty metric as absent, as a blank search is', async () => {
    expect(await run({ metric: '' })).toMatchObject({ status: 'ok', count: 3, prefixes: expect.any(Array) });
  });

  describe('with metric: its labels and their values', () => {
    const NOW_S = 1_762_335_120;
    const PODS = Array.from({ length: 25 }, (_, i) => `pod-${String(i).padStart(2, '0')}`);

    // Prometheus as the lab cluster answers it, endpoint by endpoint.
    const prometheus = (answers: Record<string, unknown>) =>
      (axios as unknown as jest.Mock).mockImplementation(async ({ url }: { url: string }) => {
        if (url === '/api/v1/metadata') return { data: METADATA };
        if (!(url in answers)) throw { response: { status: 404 } };
        return { data: { status: 'success', data: answers[url] } };
      });

    beforeEach(() => jest.spyOn(Date, 'now').mockReturnValue(NOW_S * 1000));
    afterEach(() => jest.restoreAllMocks());

    it('returns each label with its values, at most 20, and how many there are', async () => {
      prometheus({
        '/api/v1/query': { resultType: 'vector', result: [{ metric: {}, value: [NOW_S, '3'] }] },
        '/api/v1/labels': ['__name__', 'mountpoint', 'pod'],
        '/api/v1/label/mountpoint/values': ['/', '/boot', '/var'],
        '/api/v1/label/pod/values': PODS,
      });

      const result = await run({ metric: 'node_filesystem_avail_bytes' });

      expect(result).toEqual({
        status: 'ok',
        metric: 'node_filesystem_avail_bytes',
        type: 'gauge',
        help: 'Filesystem space available to non-root users in bytes.',
        series: 3,
        labels: [
          { name: 'mountpoint', count: 3, values: ['/', '/boot', '/var'] },
          { name: 'pod', count: 25, values: PODS.slice(0, 20) },
        ],
      });
      expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/api/v1/query', params: { query: 'count(node_filesystem_avail_bytes)' } }),
      );
      // Over the last hour, so a pod long gone is not offered as a value to filter on.
      expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/api/v1/labels',
          params: { 'match[]': 'node_filesystem_avail_bytes', start: NOW_S - 3600, end: NOW_S },
        }),
      );
    });

    it('takes precedence over search', async () => {
      prometheus({ '/api/v1/query': { result: [] }, '/api/v1/labels': [] });
      expect(await run({ metric: 'etcd_server_has_leader', search: 'node' })).toMatchObject({
        metric: 'etcd_server_has_leader',
      });
    });

    it('reads a recording rule too, which has no metadata', async () => {
      prometheus({
        '/api/v1/query': { result: [{ value: [NOW_S, '1'] }] },
        '/api/v1/labels': ['__name__', 'instance'],
        '/api/v1/label/instance/values': ['node-1'],
      });

      expect(await run({ metric: 'instance:node_cpu_utilisation:rate5m' })).toMatchObject({
        type: 'unknown',
        series: 1,
        labels: [{ name: 'instance', count: 1, values: ['node-1'] }],
      });
    });

    it('says a metric Prometheus knows but holds no data for is not a value of zero', async () => {
      prometheus({ '/api/v1/query': { result: [] }, '/api/v1/labels': ['__name__'] });

      const result = await run({ metric: 'etcd_server_has_leader' });

      expect(result).toMatchObject({ status: 'ok', series: 0, labels: [] });
      expect(result.message).toMatch(/not a value of zero/);
    });

    it('sends a name no metric has back to search, whatever labels the proxy still answers', async () => {
      // The console's proxy answers its own labels for any name, a name that exists nowhere included.
      prometheus({
        '/api/v1/query': { result: [] },
        '/api/v1/labels': ['prometheus', 'prometheus_replica'],
        '/api/v1/label/prometheus/values': ['metalk8s-monitoring/prometheus-operator-prometheus'],
        '/api/v1/label/prometheus_replica/values': ['prometheus-prometheus-operator-prometheus-0'],
      });

      const result = await run({ metric: 'node_filesystem_avail' });

      expect(result).toMatchObject({ series: 0, labels: [] });
      expect(result.message).toMatch(/Search for it/);
    });

    it('still answers with the labels when the metadata cannot be read, only without type and help', async () => {
      (axios as unknown as jest.Mock).mockImplementation(async ({ url }: { url: string }) => {
        if (url === '/api/v1/metadata') throw { response: { status: 504 } };
        if (url === '/api/v1/query')
          return { data: { status: 'success', data: { result: [{ value: [NOW_S, '1'] }] } } };
        if (url === '/api/v1/labels') return { data: { status: 'success', data: ['__name__', 'instance'] } };
        return { data: { status: 'success', data: ['node-1'] } };
      });

      expect(await run({ metric: 'instance:node_cpu_utilisation:rate5m' })).toEqual({
        status: 'ok',
        metric: 'instance:node_cpu_utilisation:rate5m',
        type: 'unknown',
        help: '',
        series: 1,
        labels: [{ name: 'instance', count: 1, values: ['node-1'] }],
      });
    });

    it('does not claim a metric does not exist when it could not read the metadata to tell', async () => {
      (axios as unknown as jest.Mock).mockImplementation(async ({ url }: { url: string }) => {
        if (url === '/api/v1/metadata') throw { response: { status: 504 } };
        if (url === '/api/v1/query') return { data: { status: 'success', data: { result: [] } } };
        return { data: { status: 'success', data: [] } };
      });

      const result = await run({ metric: 'etcd_server_has_leader' });

      expect(result).toMatchObject({ status: 'ok', series: 0, labels: [] });
      expect(result.message).toMatch(/either no metric has that name, or it holds no data/);
    });

    it('refuses anything but a metric name, since it goes into a query', async () => {
      const result = await run({ metric: 'up) or vector(1' });

      expect(result.status).toBe('malformed');
      expect(axios).not.toHaveBeenCalled();
    });

    it('says it could not look, rather than "no labels", when not allowed', async () => {
      (axios as unknown as jest.Mock).mockImplementation(async ({ url }: { url: string }) => {
        if (url === '/api/v1/metadata') return { data: METADATA };
        throw { response: { status: 403, data: 'Forbidden' } };
      });
      expect((await run({ metric: 'etcd_server_has_leader' })).status).toBe('not_authorized');
    });
  });
});
