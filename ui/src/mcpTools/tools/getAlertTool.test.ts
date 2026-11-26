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
    expect(result).toEqual({ status: 'ok', expr: 'up', alert: ALERT });
    expect(window.fetch).not.toHaveBeenCalled();
  });

  it("decodes the rule's PromQL out of the generatorURL", async () => {
    const generatorURL =
      'http://prometheus-operator-prometheus.metalk8s-monitoring:9090/graph?g0.expr=max+by+%28instance%29+%281+-+node_filesystem_avail_bytes%7Bfstype%21~%22tmpfs%22%7D%29+%3E+0.9&g0.tab=1';
    const result = await run('7f3a9c1e', loaded([{ ...ALERT, generatorURL }]));
    expect(result.expr).toBe('max by (instance) (1 - node_filesystem_avail_bytes{fstype!~"tmpfs"}) > 0.9');
  });

  it('leaves expr out when the alert carries no rule link', async () => {
    const result = await run('7f3a9c1e', loaded([{ ...ALERT, generatorURL: '' }]));
    expect(result).not.toHaveProperty('expr');
    expect(result.status).toBe('ok');
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
