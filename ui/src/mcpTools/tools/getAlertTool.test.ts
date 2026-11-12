import type { ToolContext } from '../types';
import { failed, loaded, notLoadedYet, raw } from './alertCache.testUtils';
import { createGetAlertTool } from './getAlertTool';

const run = (id: string, context: ToolContext) =>
  createGetAlertTool(context).execute({ id }) as Promise<Record<string, unknown>>;

const ALERT = {
  ...raw('PrometheusVolumeIsAlmostFull', 'critical', '7f3a9c1e', { persistentvolumeclaim: 'prometheus-db-0' }),
  annotations: { summary: 'Prometheus volume is almost full.', runbook_url: 'https://docs.example/volume-full' },
};

beforeEach(() => {
  window.fetch = jest.fn() as never;
});

describe('getAlert', () => {
  it('is declared read-only', () => {
    expect(createGetAlertTool(notLoadedYet()).annotations).toEqual({ readOnlyHint: true });
  });

  it("returns Alertmanager's own object for that alert, from the console's cache", async () => {
    const result = await run('7f3a9c1e', loaded([ALERT, raw('NodeDown', 'warning', 'other')]));
    expect(result).toEqual({ status: 'ok', alert: ALERT });
    expect(window.fetch).not.toHaveBeenCalled();
  });

  it('says an unknown id is unknown', async () => {
    const result = await run('nope', loaded([ALERT]));
    expect(result.status).toBe('not_found');
    expect(result.message).toMatch(/getAlerts/);
  });

  it('does not call an id "not found" before the alerts have even loaded', async () => {
    expect((await run('7f3a9c1e', notLoadedYet())).status).toBe('unavailable');
  });

  it('says it could not look, rather than "not found", when not allowed', async () => {
    expect((await run('7f3a9c1e', await failed(403))).status).toBe('not_authorized');
  });
});
