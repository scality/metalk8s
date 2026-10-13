// A bounded window of one container's log, optionally searched — the read behind the `getPodLogs`
// MCP tool.
//
// The window parameters are the log API's own, named as it names them, because someone who knows
// `kubectl logs` already knows them. Two do not quite keep the API's meaning: sinceTime is sent, and
// then cut again here, strictly after the instant given — the API's is inclusive and would hand back
// the line a caller resumed from. And limitBytes keeps the last bytes of a tail read, where the
// API's keeps the first bytes of the range; that end is still the API's own when reading forward,
// and there it is left to the server.

import type { K8sApiClients } from './clients';
import { failureFor, K8sApiError, statusCodeOf } from './resources';

/** Lines, when nothing else bounds the read. kubectl's own default is the whole log. */
export const DEFAULT_TAIL_LINES = 200;
/** Ceilings. Asking past them is clamped and said so, never silently obeyed. */
export const MAX_TAIL_LINES = 2000;
export const MAX_LOG_BYTES = 256 * 1024;
export const MAX_CONTEXT_LINES = 10;

/** Which parameter stopped the read — actionable where a bare `truncated: true` is not. */
export type LogBound = 'tailLines' | 'sinceSeconds' | 'sinceTime' | 'limitBytes' | 'bytes' | 'default';

export type LogParams = {
  pod: string;
  namespace: string;
  container?: string;
  tailLines?: number;
  sinceSeconds?: number;
  sinceTime?: string;
  limitBytes?: number;
  previous?: boolean;
  timestamps?: boolean;
  pattern?: string;
  contextLines?: number;
};

export type PodLogs = {
  pod: string;
  namespace: string;
  container?: string;
  previous?: boolean;
  text: string;
  /** Pass back as sinceTime to read forward. null when the last line carries no timestamp. */
  latest: string | null;
  bounded: LogBound;
  /** The names, when `container` was needed and not given. null otherwise. */
  containers: string[] | null;
  pattern?: string;
  matchCount?: number;
  searched?: { lines: number; bytes: number };
  lines?: number;
  bytes?: number;
};

/** A name is never a path, whatever the client encodes. */
const SEGMENT = /^[a-z0-9]([-a-z0-9.]*[a-z0-9])?$/;

const RFC3339 = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))/;

const checkSegment = (what: string, value: string) => {
  if (typeof value !== 'string' || !value || value.length > 253 || value.includes('..') || !SEGMENT.test(value)) {
    throw new K8sApiError('malformed', `"${value}" is not a ${what}.`);
  }
};

/**
 * Everything about a request that can be judged without asking the cluster anything, and the
 * clamping that goes with it.
 *
 * Exported so a caller can refuse a bad request before opening a connection: a pattern that does not
 * compile should cost nothing.
 */
export const checkLogParams = (params: LogParams): { params: LogParams; clamped: LogBound | null } => {
  checkSegment('pod name', params.pod);
  checkSegment('namespace', params.namespace);
  if (params.container !== undefined) checkSegment('container name', params.container);

  // Refused here rather than relayed as the API's 400, which a caller would have to interpret.
  if (params.sinceSeconds !== undefined && params.sinceTime !== undefined) {
    throw new K8sApiError('malformed', 'sinceSeconds and sinceTime are alternatives; give one.');
  }

  /**
   * The API applies both, in this order: the lines after the instant, and then the last N of those.
   * So the lines between the two are skipped, and `latest` comes back past them — a forward read
   * that loses its oldest lines and no later call can ask for them again. A cap that keeps the end
   * cannot be resumed from; limitBytes is the one that bounds a forward read, because the server
   * applies it from the start of the range.
   */
  if (params.tailLines !== undefined && (params.sinceTime !== undefined || params.sinceSeconds !== undefined)) {
    throw new K8sApiError(
      'malformed',
      'tailLines counts back from the end, so combining it with sinceSeconds or sinceTime silently skips the lines in between. Use limitBytes to bound a read that moves forward.',
    );
  }
  if (params.sinceTime !== undefined && !RFC3339.test(params.sinceTime)) {
    throw new K8sApiError('malformed', `"${params.sinceTime}" is not an RFC 3339 time.`);
  }
  if (params.pattern !== undefined) {
    try {
      new RegExp(params.pattern);
    } catch (error) {
      // The engine's own message: it says which part of the pattern it could not read.
      throw new K8sApiError(
        'malformed',
        `"${params.pattern}" is not a regular expression: ${(error as Error).message}`,
      );
    }
  }

  // The first three so that a 400 can be read as "there is no log", never as "you asked wrongly".
  // contextLines never reaches the API at all, and a fraction of a line walks search() past every
  // index it meant to keep, so the matches vanish while matchCount still counts them.
  for (const [name, value, least] of [
    ['tailLines', params.tailLines, 1],
    ['sinceSeconds', params.sinceSeconds, 1],
    ['limitBytes', params.limitBytes, 1],
    ['contextLines', params.contextLines, 0],
  ] as const) {
    if (value !== undefined && (typeof value !== 'number' || !Number.isInteger(value) || value < least)) {
      throw new K8sApiError('malformed', `${name} is a whole number of at least ${least}, not "${value}".`);
    }
  }

  let clamped: LogBound | null = null;
  const tailLines = params.tailLines !== undefined ? Math.min(params.tailLines, MAX_TAIL_LINES) : undefined;
  if (tailLines !== undefined && tailLines !== params.tailLines) clamped = 'tailLines';
  const limitBytes = params.limitBytes !== undefined ? Math.min(params.limitBytes, MAX_LOG_BYTES) : undefined;
  if (limitBytes !== undefined && limitBytes !== params.limitBytes) clamped = 'limitBytes';
  const contextLines = Math.min(Math.max(params.contextLines ?? 0, 0), MAX_CONTEXT_LINES);

  return { params: { ...params, tailLines, limitBytes, contextLines }, clamped };
};

/** Which container to read, or the names to choose from when that cannot be decided here. */
const resolveContainer = async (clients: K8sApiClients, pod: string, namespace: string) => {
  let object: { spec?: { containers?: { name?: string }[]; initContainers?: { name?: string }[] } };
  try {
    const response = await clients.coreV1.readNamespacedPod(pod, namespace);
    object = response?.body as typeof object;
  } catch (error) {
    throw failureFor(error);
  }

  const containers = (object?.spec?.containers ?? []).map((c) => c.name).filter(Boolean) as string[];
  const initContainers = (object?.spec?.initContainers ?? []).map((c) => c.name).filter(Boolean) as string[];

  // The API requires a name only when there is more than one ordinary container; an init container
  // is addressable either way, so its name is offered without being demanded.
  if (containers.length > 1) return { choose: [...containers, ...initContainers] };
  return { container: containers[0] };
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** UTF-8 bytes, as the API counts them: `duration=2.593µs` is 16 characters and 17 bytes. */
const byteLength = (value: string) => encoder.encode(value).length;

/** The first or last `cap` bytes, never splitting a character in half. */
const bytesOf = (value: string, cap: number, from: 'start' | 'end') => {
  const bytes = encoder.encode(value);
  if (bytes.length <= cap) return value;
  const continues = (byte: number) => (byte & 0xc0) === 0x80;

  if (from === 'start') {
    let end = cap;
    while (end > 0 && continues(bytes[end])) end--;
    return decoder.decode(bytes.subarray(0, end));
  }
  let start = bytes.length - cap;
  while (start < bytes.length && continues(bytes[start])) start++;
  return decoder.decode(bytes.subarray(start));
};

const lastTimestamp = (text: string): string | null => {
  const lines = text.split('\n').filter((line) => line.length > 0);
  const match = RFC3339.exec(lines[lines.length - 1] ?? '');
  // A guess here would be a cursor that silently rereads, which is worse than saying there is none.
  return match ? match[1] : null;
};

/**
 * Lines after the instant asked for, with the boundary line itself dropped by its exact timestamp
 * rather than by comparison.
 *
 * The kubelet writes nanoseconds and Date keeps milliseconds, so `> since` would also drop every
 * line sharing that millisecond — and bursts share one routinely. Those lines would never come back,
 * since the next read starts later still.
 */
const after = (text: string, sinceTime: string): string => {
  const since = new Date(sinceTime).getTime();
  const kept = text.split('\n').filter((line) => {
    const match = RFC3339.exec(line);
    return match ? new Date(match[1]).getTime() >= since && match[1] !== sinceTime : false;
  });
  return kept.length > 0 ? `${kept.join('\n')}\n` : '';
};

/** grep -C, over a window already in hand: matching lines plus their neighbours, each line once. */
const search = (text: string, pattern: string, contextLines: number) => {
  const lines = text.split('\n');
  if (lines[lines.length - 1] === '') lines.pop();

  const expression = new RegExp(pattern);
  const matched = lines.map((line) => expression.test(line));
  const matchCount = matched.filter(Boolean).length;

  const keep = new Set<number>();
  matched.forEach((isMatch, index) => {
    if (!isMatch) return;
    for (let i = index - contextLines; i <= index + contextLines; i++) if (i >= 0 && i < lines.length) keep.add(i);
  });

  const kept = [...keep].sort((a, b) => a - b).map((index) => lines[index]);
  return { text: kept.length > 0 ? `${kept.join('\n')}\n` : '', matchCount };
};

/**
 * Read one container's log.
 *
 * Throws K8sApiError, which is what makes this usable as a react-query `queryFn`: a failure is a
 * rejection, so only successes are cached.
 */
export const readPodLogs = async (clients: K8sApiClients, raw: LogParams): Promise<PodLogs> => {
  const { params, clamped } = checkLogParams(raw);
  const { pod, namespace, previous, sinceSeconds, sinceTime, limitBytes, pattern } = params;

  let container = params.container;
  if (!container) {
    const resolved = await resolveContainer(clients, pod, namespace);
    if ('choose' in resolved) {
      // Not an error, and no log request: the names are what the next call needs, and the API's own
      // 400 would have to be read back out of a string to get them.
      return {
        pod,
        namespace,
        text: '',
        latest: null,
        bounded: 'default',
        containers: resolved.choose,
      };
    }
    container = resolved.container;
  }

  // With none of the three, kubectl returns the whole log, so one of them is always sent.
  const windowed = params.tailLines !== undefined || sinceSeconds !== undefined || sinceTime !== undefined;
  const tailLines = windowed ? params.tailLines : DEFAULT_TAIL_LINES;

  // Reading forward has no line limit of its own — a `since` is the window — so without a byte limit
  // the API would stream the whole range into the tab. Here the server's own cap is the right one:
  // it keeps the start of the range, which is the end a caller resumes from.
  const forward = sinceTime !== undefined || sinceSeconds !== undefined;
  const serverLimit = forward ? (limitBytes ?? MAX_LOG_BYTES) : undefined;

  let body: string;
  try {
    // Not readNamespacedPodLog: see K8sApiClients.text. `follow` is never sent — it streams until
    // the connection closes, and a tool returns once.
    body = await clients.text(
      `/api/v1/namespaces/${encodeURIComponent(namespace)}/pods/${encodeURIComponent(pod)}/log`,
      {
        container,
        // For a tail read the server's cap would keep the wrong end, so limitBytes is applied below
        // instead, against the text in hand.
        limitBytes: serverLimit,
        previous,
        sinceSeconds,
        // Sent, so that reading forward means every line since that instant rather than the last few
        // of them. The cut is still made again below: the API's own sinceTime is inclusive.
        sinceTime,
        tailLines,
        // The API defaults this to false; latest is parsed out of the timestamps, so turning it off
        // would cost the ability to read forward.
        timestamps: params.timestamps ?? true,
      },
    );
  } catch (error) {
    throw logFailure(error);
  }

  if (typeof body !== 'string') {
    throw new K8sApiError('malformed', 'The Kubernetes API answered with something that is not a log.');
  }

  // Not re-cut when the lines carry no timestamps to cut on: the server has already applied
  // sinceTime, and filtering text that has none would drop every line of it.
  const window = sinceTime && params.timestamps !== false ? after(body, sinceTime) : body;

  let bounded: LogBound =
    clamped ??
    (sinceTime
      ? 'sinceTime'
      : sinceSeconds !== undefined
        ? 'sinceSeconds'
        : params.tailLines !== undefined
          ? 'tailLines'
          : 'default');

  // A body that reaches the limit sent is one the server stopped, and the text below will be under
  // the cap so `cut` never fires. Measured in bytes, as the server counts them: a log full of `µ`
  // is shorter in characters than in bytes, and a missing trailing newline misses a cut that landed
  // on one. Without this, bounded would say sinceTime — everything since that instant, when this is
  // the first page of it.
  if (serverLimit !== undefined && new TextEncoder().encode(body).length >= serverLimit) {
    bounded = limitBytes !== undefined ? 'limitBytes' : 'bytes';
  }

  const cap = limitBytes ?? MAX_LOG_BYTES;

  /**
   * The cap, kept at the end the caller can come back to: reading forward that is the start, since
   * `latest` resumes from there and dropping the oldest would leave a gap; reading the tail it is
   * the end, where a failure is.
   */
  const cut = (value: string) => {
    if (byteLength(value) <= cap) return value;
    bounded = limitBytes !== undefined ? 'limitBytes' : 'bytes';
    if (sinceTime) return bytesOf(value, cap, 'start');

    // A tail starts at a line boundary, so its first line is whole. When no whole line fits, the
    // last one comes back over the cap rather than as a fragment with no timestamp on the front.
    const tail = bytesOf(value, cap, 'end');
    if (value[value.length - tail.length - 1] === '\n') return tail;

    const boundary = tail.indexOf('\n') + 1;
    if (boundary > 0 && boundary < tail.length) return tail.slice(boundary);

    const lastLine = value.slice(value.lastIndexOf('\n', value.length - 2) + 1);
    return bytesOf(lastLine, MAX_LOG_BYTES, 'end');
  };

  const countLines = (value: string) => (value === '' ? 0 : value.replace(/\n$/, '').split('\n').length);

  /**
   * Where to read on from. A forward read that finds nothing new comes back empty, and answering
   * null there would tell a caller polling a quiet container that it has lost its place — when the
   * place it had is still good.
   */
  const cursor = (value: string) => lastTimestamp(value) ?? (value === '' ? (sinceTime ?? null) : null);
  const base = { pod, namespace, container, ...(previous !== undefined ? { previous } : {}), containers: null };

  if (pattern === undefined) {
    const text = cut(window);
    return { ...base, text, lines: countLines(text), bytes: byteLength(text), latest: cursor(text), bounded };
  }

  // The whole window is searched, and only the matches are then capped. Capping first would drop
  // matches without counting them, which is the one thing matchCount exists to rule out.
  const found = search(window, pattern, params.contextLines ?? 0);
  const text = cut(found.text);
  return {
    ...base,
    pattern,
    text,
    matchCount: found.matchCount,
    // A pattern finding nothing in 200 lines is a different fact from finding nothing in the log,
    // and this is what separates them.
    searched: { lines: countLines(window), bytes: byteLength(window) },
    // The window was searched to its end, so that is where reading forward resumes — not the last
    // line that happened to match.
    latest: cursor(window),
    bounded,
  };
};

/**
 * A 400 from the log endpoint is the API describing the pod, not refusing the request — every
 * parameter this tool exposes is checked before the call, so what is left is "there is no log to
 * give you", and the API says why: a container waiting on its image, one that never restarted, one
 * still being created. `unavailable` would answer all of those with "the API could not be reached".
 */
const logFailure = (error: unknown): K8sApiError => {
  const failure = failureFor(error);
  const message = (error as { body?: { message?: string } })?.body?.message ?? '';

  // Reworded, because the API's own sentence reads as a fault in the request rather than as the
  // fact that the container has only ever run once.
  if (/previous terminated container/i.test(message)) {
    return new K8sApiError(
      'not_found',
      'This container has not restarted, so there is no previous run to read. Its current log is available without previous.',
    );
  }

  if (statusCodeOf(error) === 400 && message) return new K8sApiError('not_found', message);
  return message && !failure.detail ? new K8sApiError(failure.status, message) : failure;
};

/** The same read as a react-query definition, so a panel and a tool share one cache. */
export const podLogsQuery = (clients: K8sApiClients, params: LogParams) => ({
  queryKey: ['podLogs', params.namespace, params.pod, params.container ?? '', JSON.stringify(params)] as const,
  queryFn: () => readPodLogs(clients, params),
  // A log read during a diagnosis is what the container has said by now.
  staleTime: 5000,
  retry: false as const,
});
