import axios from 'axios';
import { QueryClient } from 'react-query';
import type { ToolContext } from '../types';
import { createExecutePrometheusQueryTool } from './executePrometheusQueryTool';

jest.mock('axios');

const makeContext = (overrides: Partial<ToolContext> = {}): ToolContext =>
  ({
    getToken: jest.fn().mockResolvedValue('a-fresh-token'),
    userData: undefined,
    selfConfiguration: { url: '/api/kubernetes', url_prometheus: '/api/prometheus' },
    queryClient: new QueryClient(),
    ...overrides,
  }) as ToolContext;

const run = (
  params: { query: string; range?: { start: string; end?: string; step?: string } },
  context = makeContext(),
) => createExecutePrometheusQueryTool(context).execute(params) as Promise<Record<string, unknown>>;

const VECTOR = {
  status: 'success',
  data: { resultType: 'vector', result: [{ metric: { instance: 'node-1' }, value: [1762335120.5, '0.93'] }] },
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Date, 'now').mockReturnValue(1_762_335_120_000);
});

describe('executePrometheusQuery', () => {
  it('is declared read-only', () => {
    expect(createExecutePrometheusQueryTool(makeContext()).annotations).toEqual({ readOnlyHint: true });
  });

  it("runs an instant query and returns Prometheus's JSON untouched", async () => {
    (axios as unknown as jest.Mock).mockResolvedValue({ data: VECTOR });

    const result = await run({ query: 'up == 0' });

    expect(result).toEqual(VECTOR);
    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: '/api/prometheus',
        url: '/api/v1/query',
        params: { query: 'up == 0' },
        headers: { Authorization: 'Bearer a-fresh-token' },
      }),
    );
  });

  it('runs a range query from a given time up to now, at about 200 points by default', async () => {
    (axios as unknown as jest.Mock).mockResolvedValue({ data: VECTOR });

    // An alert's startsAt, three hours before now, as RFC 3339.
    await run({ query: 'node_load1', range: { start: '2025-11-05T06:32:00Z' } });

    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/api/v1/query_range',
        params: { query: 'node_load1', start: 1_762_335_120 - 180 * 60, end: 1_762_335_120, step: 54 },
      }),
    );
  });

  it('keeps the end and the step it was given, in RFC 3339 or unix seconds', async () => {
    (axios as unknown as jest.Mock).mockResolvedValue({ data: VECTOR });

    await run({ query: 'node_load1', range: { start: '1762324320', end: '2025-11-05T08:32:00Z', step: '5m' } });

    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        params: { query: 'node_load1', start: 1_762_335_120 - 180 * 60, end: 1_762_335_120 - 60 * 60, step: '5m' },
      }),
    );
  });

  it.each([
    ['a start it cannot read', { start: 'yesterday' }],
    ['a start after the end', { start: '2025-11-05T08:32:00Z', end: '2025-11-05T06:32:00Z' }],
  ])('refuses %s without calling Prometheus', async (_, range) => {
    const result = await run({ query: 'node_load1', range });

    expect(result.status).toBe('malformed');
    expect(axios).not.toHaveBeenCalled();
  });

  it("passes a rejected query back as Prometheus's own error, so it can be fixed", async () => {
    const refusal = { status: 'error', errorType: 'bad_data', error: 'parse error at char 4' };
    (axios as unknown as jest.Mock).mockRejectedValue({ response: { status: 400, data: refusal } });

    expect(await run({ query: 'up ==' })).toEqual(refusal);
  });

  it('says it could not look, rather than returning an empty result, when not allowed', async () => {
    (axios as unknown as jest.Mock).mockRejectedValue({ response: { status: 403, data: 'Forbidden' } });
    expect((await run({ query: 'up' })).status).toBe('not_authorized');
  });

  it('asks to sign in again when Prometheus answers 401', async () => {
    (axios as unknown as jest.Mock).mockRejectedValue({ response: { status: 401, data: 'Unauthorized' } });
    expect((await run({ query: 'up' })).status).toBe('session_expired');
  });

  it('asks to sign in again, without calling Prometheus, when there is no token', async () => {
    const result = await run({ query: 'up' }, makeContext({ getToken: jest.fn().mockResolvedValue(null) }));
    expect(result.status).toBe('session_expired');
    expect(axios).not.toHaveBeenCalled();
  });

  it('is unavailable, rather than an empty result, when Prometheus does not answer at all', async () => {
    (axios as unknown as jest.Mock).mockRejectedValue(new Error('Network Error'));
    expect((await run({ query: 'up' })).status).toBe('unavailable');
  });

  it('is unavailable when the deployment exposes no Prometheus', async () => {
    const result = await run({ query: 'up' }, makeContext({ selfConfiguration: { url: '/api/kubernetes' } }));
    expect(result.status).toBe('unavailable');
    expect(axios).not.toHaveBeenCalled();
  });
});
