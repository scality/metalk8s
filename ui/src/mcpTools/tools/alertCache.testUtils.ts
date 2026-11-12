import { QueryClient } from 'react-query';
import { formatActiveAlerts, removeWarningAlerts, sortAlerts } from '../../services/alertUtils';
import type { ToolContext } from '../types';

// The alert cache in each of the states the console can leave it in, for the alert tools' tests.

export const raw = (alertname: string, severity: string, fingerprint: string, extra: Record<string, string> = {}) => ({
  fingerprint,
  labels: { alertname, severity, ...extra },
  annotations: { summary: `${alertname} summary` } as Record<string, string>,
  startsAt: '2026-11-05T09:12:00Z',
  endsAt: '2026-11-05T10:12:00Z',
  updatedAt: '2026-11-05T09:12:00Z',
  receivers: [],
  status: { state: 'active' as const, silencedBy: [], inhibitedBy: [] },
  generatorURL: 'http://prometheus:9090/graph?g0.expr=up&g0.tab=1',
});

export const contextWith = (queryClient: QueryClient): ToolContext =>
  ({
    getToken: jest.fn().mockResolvedValue('a-fresh-token'),
    userData: undefined,
    selfConfiguration: { url: '/api/kubernetes' },
    queryClient,
  }) as ToolContext;

/** What shell-ui's AlertProvider puts in the cache after Alertmanager answers. */
export const loaded = (alerts: ReturnType<typeof raw>[]) => {
  const queryClient = new QueryClient();
  queryClient.setQueryData(['activeAlerts'], sortAlerts(removeWarningAlerts(formatActiveAlerts(alerts as never))));
  return contextWith(queryClient);
};

/** Mounted, but Alertmanager has not answered yet: only the provider's `initialData: []`. */
export const notLoadedYet = () => {
  const queryClient = new QueryClient();
  queryClient.getQueryCache().build(queryClient, { queryKey: ['activeAlerts'], initialData: [] });
  return contextWith(queryClient);
};

/** Alertmanager refused or failed: shell-ui's getAlerts throws with the HTTP status in its message. */
export const failed = async (httpStatus: number) => {
  const queryClient = new QueryClient();
  queryClient.getQueryCache().build(queryClient, { queryKey: ['activeAlerts'], initialData: [] });
  await queryClient.prefetchQuery(['activeAlerts'], () =>
    Promise.reject(new Error(`Alert manager responded with ${httpStatus}`)),
  );
  return contextWith(queryClient);
};
