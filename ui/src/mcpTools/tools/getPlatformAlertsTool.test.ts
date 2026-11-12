import { QueryClient } from 'react-query';
import type { ToolContext } from '../types';
import { contextWith, failed, loaded, notLoadedYet, raw } from './alertCache.testUtils';
import { createGetPlatformAlertsTool } from './getPlatformAlertsTool';

const run = (context: ToolContext) => createGetPlatformAlertsTool(context).execute() as Promise<Record<string, unknown>>;

beforeEach(() => {
  window.fetch = jest.fn() as never;
});

describe('getPlatformAlerts', () => {
  it('is declared read-only', () => {
    expect(createGetPlatformAlertsTool(notLoadedYet()).annotations).toEqual({ readOnlyHint: true });
  });

  it('returns the list the console holds, in its order, without calling Alertmanager again', async () => {
    const context = loaded([
      raw('VolumeAlmostFull', 'warning', 'w1', { instance: 'node-1' }),
      raw('VolumeAlmostFull', 'critical', 'c1', { instance: 'node-1' }),
      raw('NodeDown', 'warning', 'w2', { instance: 'node-2' }),
    ]);

    expect(await run(context)).toEqual({
      status: 'ok',
      alerts: [
        { id: 'c1', severity: 'critical', alertname: 'VolumeAlmostFull', description: 'VolumeAlmostFull summary', startsAt: '2026-11-05T09:12:00Z' },
        { id: 'w2', severity: 'warning', alertname: 'NodeDown', description: 'NodeDown summary', startsAt: '2026-11-05T09:12:00Z' },
      ],
    });
    expect(window.fetch).not.toHaveBeenCalled();
  });

  it('reads the description the way the alert page does, so an alert with no summary is not blank', async () => {
    const LICENSE =
      'Your product instance is missing a valid license key.\nYou can request one from Scality by sending an email to\n' +
      'sales_operations@scality.com providing your company name\nand instance ID.\n';
    const context = loaded([{ ...raw('MissingLicense', 'warning', 'l1'), annotations: { description: LICENSE } }]);

    const { alerts } = (await run(context)) as { alerts: Array<Record<string, unknown>> };

    expect(alerts[0].description).toBe(LICENSE);
  });

  it('returns an empty list only when Alertmanager really answered with none', async () => {
    expect(await run(loaded([]))).toEqual({ status: 'ok', alerts: [] });
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
