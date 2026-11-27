// What the monitoring tools share: reading the alerts the console already holds, and what to say
// when they could not look.
//
// Kept apart from kubeTools: Alertmanager and Prometheus sit behind their own proxies, not the
// Kubernetes API, so kubeTools' wording about RBAC and resource kinds would be wrong here.

import type { Alert } from '../services/alertUtils';
import type { ToolContext } from './types';

/**
 * One wording per failure. The point of all three is the same: a tool that could not look must say
 * so, because an empty answer reads as "nothing is wrong".
 */
export const unreadable = (source: 'Alertmanager' | 'Prometheus', httpStatus?: number) => {
  if (httpStatus === 401) {
    return { status: 'session_expired', message: 'Your session has expired. Sign in again, then retry once.' };
  }
  if (httpStatus === 403) {
    return {
      status: 'not_authorized',
      message:
        `You are not allowed to read ${source}. This does NOT mean there is nothing there — say ` +
        'you could not look, never that nothing was found.',
    };
  }
  return {
    status: 'unavailable',
    message: `${source} could not be reached${httpStatus ? ` (HTTP ${httpStatus})` : ''}.`,
  };
};

/**
 * shell-ui's AlertProvider query. The navbar mounts it on every page — through this app's
 * AlertsNavbarUpdater — and refetches it every 30 s, into the QueryClient the shell shares with
 * every app and hands the tools as context.queryClient.
 */
const ALERTS_QUERY_KEY = ['activeAlerts'];

/**
 * The alerts the console already holds — the very list the alert page renders, already formatted,
 * stripped of covered warnings and sorted — or why they cannot be trusted.
 *
 * Read from the cache rather than fetched again: the page fetched it at most 30 s ago, and reading
 * it is what makes "the same list as the user" literal rather than re-derived.
 *
 * Two states of that cache look like "no alerts" and are not, and both are refused:
 *   - before Alertmanager first answers, the provider's `initialData: []` is all there is. Only a
 *     real response raises dataUpdateCount, so 0 means "not loaded", never "nothing firing".
 *   - after a failed fetch the query is in error but keeps that data, so a 403 would otherwise
 *     read as an empty platform.
 */
export const readAlerts = (context: ToolContext): { alerts: Alert[] } | { refusal: ReturnType<typeof unreadable> } => {
  const state = context.queryClient.getQueryState<Alert[]>(ALERTS_QUERY_KEY);

  if (state?.status === 'error') {
    // shell-ui's getAlerts throws "Alert manager responded with <status>"; nothing else carries it.
    const httpStatus = Number(String((state.error as Error)?.message).match(/responded with (\d+)/)?.[1]);
    return { refusal: unreadable('Alertmanager', httpStatus || undefined) };
  }

  if (!state || state.dataUpdateCount === 0) {
    return {
      refusal: {
        status: 'unavailable',
        message:
          'The alerts have not been loaded yet. This does NOT mean nothing is firing — say so, and ' +
          'try again in a few seconds.',
      },
    };
  }

  return { alerts: state.data ?? [] };
};
