import { QueryClient } from 'react-query';
import type { ToolContext } from '../types';
import { contextWith, failed, loaded, notLoadedYet, raw } from './alertCache.testUtils';
import { createGetAlertsTool } from './getAlertsTool';

const run = (context: ToolContext) => createGetAlertsTool(context).execute() as Promise<Record<string, unknown>>;

beforeEach(() => {
  window.fetch = jest.fn() as never;
});

describe('getAlerts', () => {
  it('is declared read-only', () => {
    expect(createGetAlertsTool(notLoadedYet()).annotations).toEqual({ readOnlyHint: true });
  });

  it('returns the list the console holds, in its order, without calling Alertmanager again', async () => {
    // Watchdog is in the fixture because it is on every healthy platform: without it this list
    // would also be asserting a broken alerting pipeline, which is a different test.
    const context = loaded([
      raw('VolumeAlmostFull', 'warning', 'w1', { instance: 'node-1' }),
      raw('VolumeAlmostFull', 'critical', 'c1', { instance: 'node-1' }),
      raw('NodeDown', 'warning', 'w2', { instance: 'node-2' }),
      raw('Watchdog', 'none', 'wd'),
    ]);

    expect(await run(context)).toEqual({
      status: 'ok',
      alerts: [
        { id: 'c1', severity: 'critical', alertname: 'VolumeAlmostFull', description: 'VolumeAlmostFull summary', startsAt: '2026-11-05T09:12:00Z' },
        { id: 'w2', severity: 'warning', alertname: 'NodeDown', description: 'NodeDown summary', startsAt: '2026-11-05T09:12:00Z' },
        { id: 'wd', severity: 'none', alertname: 'Watchdog', description: 'Watchdog summary', startsAt: '2026-11-05T09:12:00Z' },
      ],
    });
    expect(window.fetch).not.toHaveBeenCalled();
  });

  it('leaves out the parent alerts, which appear on no page', async () => {
    // lib-alert-tree puts its aggregates in the same cache, marked by a `children` label. The
    // alert page filters them out, so counting them here would make "the second alert" ambiguous.
    const context = loaded([
      raw('PlatformDegraded', 'critical', 'p1', { children: 'NodeDown,VolumeAlmostFull' }),
      raw('NodeDown', 'critical', 'c1', { instance: 'node-2' }),
    ]);

    const { alerts } = (await run(context)) as { alerts: Array<Record<string, unknown>> };

    expect(alerts.map((alert) => alert.id)).toEqual(['c1']);
  });

  it('reads the description the way the alert page does, so an alert with no summary is not blank', async () => {
    const LICENSE =
      'Your product instance is missing a valid license key.\nYou can request one from Scality by sending an email to\n' +
      'sales_operations@scality.com providing your company name\nand instance ID.\n';
    const context = loaded([{ ...raw('MissingLicense', 'warning', 'l1'), annotations: { description: LICENSE } }]);

    const { alerts } = (await run(context)) as { alerts: Array<Record<string, unknown>> };

    expect(alerts[0].description).toBe(LICENSE);
  });

  it('treats nothing at all as a broken alerting pipeline, not a healthy platform', async () => {
    // Watchdog fires permanently and for no other reason than to prove the pipeline works, so an
    // empty list means Prometheus or Alertmanager has stopped reporting.
    const result = await run(loaded([]));

    expect(result.alerts).toEqual([]);
    expect(result.alertingPipelineSuspect).toEqual(expect.stringContaining('Watchdog'));
  });

  it('flags the pipeline when Watchdog is missing even though other alerts are firing', async () => {
    // The case that matters: a list of real alerts reads as a working platform, and the one alert
    // that proves alerting still works is not in it. AlertNavbarUpdaterComponent raises "Alerting
    // Service is Unavailable" on the same condition, so the tool and the navbar agree.
    const result = await run(loaded([raw('NodeDown', 'critical', 'c1'), raw('VolumeAlmostFull', 'warning', 'w1')]));

    expect(result.alerts).toHaveLength(2);
    expect(result.alertingPipelineSuspect).toEqual(expect.stringContaining('Watchdog'));
  });

  it('says nothing about the pipeline while alerts are coming through', async () => {
    const result = await run(loaded([raw('Watchdog', 'none', 'wd'), raw('NodeDown', 'critical', 'c1')]));

    expect(result.alertingPipelineSuspect).toBeUndefined();
  });

  it('returns an empty list only when Alertmanager really answered with none', async () => {
    expect(await run(loaded([]))).toMatchObject({ status: 'ok', alerts: [] });
  });

  it('leaves Watchdog in the list, because the alert page shows it', async () => {
    const result = await run(loaded([raw('Watchdog', 'none', 'wd')]));

    expect(result.alerts).toEqual([
      { id: 'wd', severity: 'none', alertname: 'Watchdog', description: 'Watchdog summary', startsAt: '2026-11-05T09:12:00Z' },
    ]);
  });

  it("refuses the provider's initial empty list: not loaded is not \"nothing firing\"", async () => {
    const result = await run(notLoadedYet());
    expect(result.status).toBe('unavailable');
    expect(result).not.toHaveProperty('alerts');
  });

  it('refuses when no console part has loaded the alerts at all', async () => {
    expect((await run(contextWith(new QueryClient()))).status).toBe('unavailable');
  });

  it('says it could not look when Alertmanager refused, though the cache still holds an empty list', async () => {
    const result = await run(await failed(403));
    expect(result.status).toBe('not_authorized');
    expect(result).not.toHaveProperty('alerts');
  });

  it('asks to sign in again when the session has expired', async () => {
    expect((await run(await failed(401))).status).toBe('session_expired');
  });
});
