import type { K8sApiClients } from './clients';
import { DEFAULT_TAIL_LINES, MAX_LOG_BYTES, MAX_TAIL_LINES, readPodLogs } from './logs';

const makeClients = () =>
  ({
    coreV1: { readNamespacedPod: jest.fn() },
    text: jest.fn(),
  }) as unknown as K8sApiClients;

const ok = (body: unknown) => Promise.resolve({ response: { statusCode: 200 }, body });
const apiRejection = (statusCode: number, message?: string) => ({
  response: { statusCode },
  body: message ? { message } : {},
});

const onePod = { spec: { containers: [{ name: 'web' }] } };
const read = (clients: K8sApiClients, params: Record<string, unknown> = {}) =>
  readPodLogs(clients, { pod: 'web-abc', namespace: 'default', ...params });

describe('readPodLogs', () => {
  let clients: K8sApiClients;

  beforeEach(() => {
    clients = makeClients();
    (clients.coreV1.readNamespacedPod as jest.Mock).mockReturnValue(ok(onePod));
  });

  it('bounds a read nobody bounded, and says that is what it did', async () => {
    (clients.text as jest.Mock).mockResolvedValue('2026-10-06T09:14:21.882Z one\n');

    const logs = await read(clients);

    // kubectl's own default here is the entire log.
    expect((clients.text as jest.Mock).mock.calls[0][1].tailLines).toBe(DEFAULT_TAIL_LINES);
    expect(logs.bounded).toBe('default');
  });

  it('returns the container names, and reads nothing, when the pod has more than one', async () => {
    (clients.coreV1.readNamespacedPod as jest.Mock).mockReturnValue(
      ok({ spec: { containers: [{ name: 'web' }, { name: 'sidecar' }], initContainers: [{ name: 'migrate' }] } }),
    );

    const logs = await read(clients);

    expect(logs.containers).toEqual(['web', 'sidecar', 'migrate']);
    expect(logs.text).toBe('');
    // The API's own answer here is a 400 whose names have to be read back out of a string.
    expect(clients.text).not.toHaveBeenCalled();
  });

  it('reads forward from a timestamp without repeating the boundary line', async () => {
    (clients.text as jest.Mock).mockResolvedValue(
      '2026-10-06T09:14:21.882Z older\n2026-10-06T09:15:00.000Z boundary\n2026-10-06T09:16:30.100Z newer\n',
    );

    const logs = await read(clients, { sinceTime: '2026-10-06T09:15:00.000Z' });

    expect(logs.text).toBe('2026-10-06T09:16:30.100Z newer\n');
    expect(logs.bounded).toBe('sinceTime');
  });

  it('asks the server for everything since the instant, not the last few lines of it', async () => {
    (clients.text as jest.Mock).mockResolvedValue('');

    await read(clients, { sinceTime: '2026-10-06T09:15:00.000Z' });

    const query = (clients.text as jest.Mock).mock.calls[0][1];
    // The default tail here would silently answer "since then" with the newest 200 lines of however
    // many there were, and bounded would still say sinceTime.
    expect(query.sinceTime).toBe('2026-10-06T09:15:00.000Z');
    expect(query.tailLines).toBeUndefined();
  });

  it('keeps the start when a read forward is over the byte cap, so the next one has no gap', async () => {
    const line = (index: number) => `2026-10-06T09:16:30.100Z #${index} ${'x'.repeat(200)}\n`;
    const last = Math.ceil(MAX_LOG_BYTES / line(0).length) + 10;
    (clients.text as jest.Mock).mockResolvedValue(Array.from({ length: last + 1 }, (_, index) => line(index)).join(''));

    const logs = await read(clients, { sinceTime: '2026-10-06T09:15:00.000Z' });

    expect(logs.bounded).toBe('bytes');
    expect(logs.text.startsWith(line(0))).toBe(true);
    expect(logs.text).not.toContain(`#${last} `);
    // Cut where the bytes ran out: the line it stops in is read again from latest, not here.
    expect(logs.bytes).toBe(MAX_LOG_BYTES);
  });

  it('never lets a read forward ask for the whole range', async () => {
    (clients.text as jest.Mock).mockResolvedValue('2026-10-06T09:16:30.100Z one\n');

    await read(clients, { sinceTime: '2026-10-06T09:15:00.000Z' });

    // A `since` is the window, so no tailLines bounds this one — without a byte limit the API would
    // stream the whole range into the tab.
    expect((clients.text as jest.Mock).mock.calls[0][1].limitBytes).toBe(MAX_LOG_BYTES);
  });

  it.each([
    ['stopped mid-line', '2026-10-06T09:16:30.100Z one\n2026-10-06T09:16:31.000Z t'],
    // The cut can land on a newline, and a body that ends in one looks complete.
    ['stopped on a line boundary', '2026-10-06T09:16:30.100Z one\n2026-10-06T09:16:31.00Z tw\n'],
  ])('says a read forward was cut when the server %s', async (_, body) => {
    (clients.text as jest.Mock).mockResolvedValue(body);

    const logs = await read(clients, { sinceTime: '2026-10-06T09:15:00.000Z', limitBytes: body.length });

    expect(logs.bounded).toBe('limitBytes');
  });

  it('counts the server cap in bytes, as the server does', async () => {
    // Two bytes each, one character each: a body of 30 characters has reached a 40-byte cap.
    const body = `2026-10-06T09:16:30.100Z ${'µ'.repeat(8)}\n`;
    (clients.text as jest.Mock).mockResolvedValue(body);

    const logs = await read(clients, {
      sinceTime: '2026-10-06T09:15:00.000Z',
      limitBytes: new TextEncoder().encode(body).length,
    });

    expect(logs.bounded).toBe('limitBytes');
  });

  it('does not read a half-written last line as a cut, on a tail the server never capped', async () => {
    (clients.text as jest.Mock).mockResolvedValue('2026-10-06T09:16:30.100Z being written right n');

    const logs = await read(clients);

    // No byte limit was sent here, so the missing newline is the container mid-write, not a cut.
    expect(logs.bounded).toBe('default');
  });

  it('still answers a read forward when the lines carry no timestamps', async () => {
    (clients.text as jest.Mock).mockResolvedValue('one\ntwo\n');

    const logs = await read(clients, { sinceTime: '2026-10-06T09:15:00.000Z', timestamps: false });

    // The server has already cut on sinceTime; cutting again on timestamps that are not there would
    // answer an empty log to a pod that is talking.
    expect(logs.text).toBe('one\ntwo\n');
    expect(logs.latest).toBeNull();
  });

  it('keeps the lines sharing the boundary line millisecond', async () => {
    (clients.text as jest.Mock).mockResolvedValue(
      '2026-10-06T09:15:00.100200300Z the line already read\n' +
        '2026-10-06T09:15:00.100400500Z the line written in the same millisecond\n',
    );

    const logs = await read(clients, { sinceTime: '2026-10-06T09:15:00.100200300Z' });

    // Date keeps milliseconds, so comparing would drop the second line — and nothing would ever
    // return it, because the next read starts later still.
    expect(logs.text).toBe('2026-10-06T09:15:00.100400500Z the line written in the same millisecond\n');
  });

  it('refuses sinceSeconds and sinceTime together, before the request', async () => {
    await expect(read(clients, { sinceSeconds: 60, sinceTime: '2026-10-06T09:15:00.000Z' })).rejects.toMatchObject({
      status: 'malformed',
    });
    expect(clients.text).not.toHaveBeenCalled();
  });

  it('parses latest off the last line', async () => {
    (clients.text as jest.Mock).mockResolvedValue('2026-10-06T09:14:21.882Z one\n2026-10-06T09:16:30.100Z two\n');

    expect((await read(clients)).latest).toBe('2026-10-06T09:16:30.100Z');
  });

  it('says latest is unavailable rather than guessing at it', async () => {
    (clients.text as jest.Mock).mockResolvedValue('no timestamp on this line\n');

    // A guess would be a cursor that silently rereads.
    expect((await read(clients, { timestamps: false })).latest).toBeNull();
  });

  it('keeps the end when the window is over the byte cap', async () => {
    const last = '2026-10-06T09:16:30.100Z the line that matters\n';
    (clients.text as jest.Mock).mockResolvedValue('x'.repeat(MAX_LOG_BYTES) + last);

    const logs = await read(clients);

    // The failure is at the end, and the server's own limitBytes truncates from the start.
    expect(logs.text.endsWith(last)).toBe(true);
    // One line longer than the ceiling is the one case the ceiling still cuts through.
    expect(logs.bytes).toBe(MAX_LOG_BYTES);
    expect(logs.bounded).toBe('bytes');
  });

  it('reads the last bytes of a tail, not the first, and does not let the server decide', async () => {
    const line = (index: number) => `2026-10-06T09:16:30.100Z #${index} ${'x'.repeat(60)}\n`;
    (clients.text as jest.Mock).mockResolvedValue(Array.from({ length: 40 }, (_, i) => line(i)).join(''));

    const logs = await read(clients, { limitBytes: 500 });

    // The server's own limitBytes would have answered with #0 onwards, which is what nobody asking
    // for "the last 500 bytes" means.
    expect((clients.text as jest.Mock).mock.calls[0][1].limitBytes).toBeUndefined();
    expect(logs.text.endsWith(line(39))).toBe(true);
    expect(logs.text).not.toContain('#0 ');
    // Whole lines, so under the cap rather than exactly on it.
    expect(logs.text.startsWith('2026-10-06T')).toBe(true);
    expect(logs.bytes).toBeLessThanOrEqual(500);
    expect(logs.bytes).toBeGreaterThan(500 - line(0).length);
    expect(logs.bounded).toBe('limitBytes');
  });

  it('lets the server cap a read forward, where the first bytes are the ones to keep', async () => {
    (clients.text as jest.Mock).mockResolvedValue('2026-10-06T09:16:30.100Z one\n');

    await read(clients, { sinceTime: '2026-10-06T09:15:00.000Z', limitBytes: 500 });

    // Here the cut is at the end the caller resumes from, so the bytes need not cross the wire.
    expect((clients.text as jest.Mock).mock.calls[0][1].limitBytes).toBe(500);
  });

  it('keeps the line a cap lands exactly on', async () => {
    const line = (index: number) => `2026-10-06T09:16:30.10${index}Z line\n`;
    (clients.text as jest.Mock).mockResolvedValue(Array.from({ length: 9 }, (_, i) => line(i)).join(''));

    const logs = await read(clients, { limitBytes: line(0).length * 3 });

    // The cut point is already a line start here; looking for the next newline would step over it
    // and answer with two lines where three fit.
    expect(logs.lines).toBe(3);
    expect(logs.text).toBe(line(6) + line(7) + line(8));
  });

  it('answers a cap smaller than one line with that line, not with a piece of it', async () => {
    (clients.text as jest.Mock).mockResolvedValue(
      '2026-10-06T09:14:21.882Z one\n2026-10-06T09:16:30.100Z the last line\n',
    );

    const logs = await read(clients, { limitBytes: 10 });

    // Ten bytes off the end is "0.100Z\n" — a fragment carrying no timestamp, so latest would be
    // null and the line unreadable. A line over the cap is the lesser evil.
    expect(logs.text).toBe('2026-10-06T09:16:30.100Z the last line\n');
    expect(logs.latest).toBe('2026-10-06T09:16:30.100Z');
    expect(logs.bounded).toBe('limitBytes');
  });

  it('counts bytes as bytes, and holds a tail to the cap in bytes', async () => {
    const line = `2026-10-06T09:16:30.100Z duration=2.593µs ${'µ'.repeat(20)}\n`;
    (clients.text as jest.Mock).mockResolvedValue(Array.from({ length: 20 }, () => line).join(''));

    const logs = await read(clients, { limitBytes: 400 });

    // Counting characters would return about twice the bytes asked for and then report the smaller
    // number, so the one field that says how much was sent would understate it.
    expect(logs.bytes).toBe(new TextEncoder().encode(logs.text).length);
    expect(logs.bytes).toBeLessThanOrEqual(400);
    expect(logs.text.startsWith('2026-10-06T')).toBe(true);
  });

  it('cuts a window that is short in characters and long in bytes', async () => {
    // 153 characters, 303 bytes, over three lines: comparing characters would call this under a
    // 200-byte cap and hand back every byte of it, saying nothing was cut.
    const line = `${'µ'.repeat(50)}\n`;
    (clients.text as jest.Mock).mockResolvedValue(line.repeat(3));

    const logs = await read(clients, { limitBytes: 200 });

    expect(logs.bytes).toBeLessThanOrEqual(200);
    expect(logs.text).toBe(line);
    expect(logs.bounded).toBe('limitBytes');
  });

  it('never cuts a character in half', async () => {
    const line = `2026-10-06T09:16:30.100Z ${'µ'.repeat(40)}\n`;
    (clients.text as jest.Mock).mockResolvedValue(line + line);

    // An odd cap lands inside a two-byte character; half of one is not a character at all.
    const logs = await read(clients, { sinceTime: '2026-10-06T09:15:00.000Z', limitBytes: 72 });

    expect(logs.text).not.toContain('\ufffd');
    expect(new TextEncoder().encode(logs.text).length).toBeLessThanOrEqual(72);
  });

  it('keeps the cursor it was given when a read forward finds nothing new', async () => {
    // What a quiet container answers: the boundary line back, and nothing after it.
    (clients.text as jest.Mock).mockResolvedValue('2026-10-06T09:15:00.000Z the line already read\n');

    const logs = await read(clients, { sinceTime: '2026-10-06T09:15:00.000Z' });

    expect(logs.text).toBe('');
    // null here would tell a caller polling a quiet pod that it has lost its place.
    expect(logs.latest).toBe('2026-10-06T09:15:00.000Z');
  });

  it.each([
    ['a fraction of a line of context', { contextLines: 1.5 }],
    ['a context that is not a number', { contextLines: Number.NaN }],
  ])('refuses %s, which would drop the matches it counted', async (_, params) => {
    await expect(read(clients, { pattern: 'BOOM', ...params })).rejects.toMatchObject({ status: 'malformed' });
    expect(clients.text).not.toHaveBeenCalled();
  });

  it('says a container has not restarted rather than coming back empty', async () => {
    (clients.text as jest.Mock).mockRejectedValue(
      apiRejection(400, 'previous terminated container "web" in pod "web-abc" not found'),
    );

    await expect(read(clients, { previous: true })).rejects.toMatchObject({
      status: 'not_found',
      detail: expect.stringMatching(/has not restarted/i),
    });
  });

  it('passes on what the API said about a container that has not started', async () => {
    (clients.text as jest.Mock).mockRejectedValue(
      apiRejection(400, 'container "web" in pod "web-abc" is waiting to start: ImagePullBackOff'),
    );

    // The commonest reason to read a log while diagnosing. Answering "the Kubernetes API could not
    // be reached" sends the reader after the cluster instead of after the image.
    await expect(read(clients)).rejects.toMatchObject({
      status: 'not_found',
      detail: expect.stringMatching(/ImagePullBackOff/),
    });
  });

  it.each([
    ['tailLines', { tailLines: 0 }],
    ['sinceSeconds', { sinceSeconds: -60 }],
    ['limitBytes', { limitBytes: 1.5 }],
  ])('refuses a %s the API would answer with a 400 of its own', async (_, params) => {
    // Every number is checked here, which is what lets a 400 be read as "there is no log".
    await expect(read(clients, params)).rejects.toMatchObject({ status: 'malformed' });
    expect(clients.text).not.toHaveBeenCalled();
  });

  it('keeps a genuinely empty log distinguishable from every failure', async () => {
    (clients.text as jest.Mock).mockResolvedValue('');

    const logs = await read(clients);

    expect(logs).toMatchObject({ text: '', lines: 0, bytes: 0, latest: null });
  });

  it('reports a pattern that matched nothing as a search, not as an empty log', async () => {
    (clients.text as jest.Mock).mockResolvedValue(
      '2026-10-06T09:14:21.882Z all is well\n2026-10-06T09:15:00.000Z still fine\n',
    );

    const logs = await read(clients, { pattern: 'deadline exceeded' });

    expect(logs.text).toBe('');
    expect(logs.matchCount).toBe(0);
    // Nothing in 2 lines is a different fact from nothing in the log.
    expect(logs.searched).toEqual({ lines: 2, bytes: 73 });
  });

  it('reports what it searched in bytes too', async () => {
    const window = `2026-10-06T09:14:21.882Z duration=2.593µs\n`;
    (clients.text as jest.Mock).mockResolvedValue(window);

    const logs = await read(clients, { pattern: 'nothing here' });

    expect(logs.searched).toEqual({ lines: 1, bytes: new TextEncoder().encode(window).length });
    expect(logs.searched?.bytes).toBeGreaterThan(window.length);
  });

  it('puts the lines around a match in the text, each one once', async () => {
    (clients.text as jest.Mock).mockResolvedValue(
      `${['one', 'two', 'BOOM', 'BOOM again', 'five', 'six'].join('\n')}\n`,
    );

    const logs = await read(clients, { pattern: 'BOOM', contextLines: 1 });

    // Two adjacent matches share neighbours; a line is kept once however many matches claim it.
    expect(logs.text).toBe('two\nBOOM\nBOOM again\nfive\n');
    expect(logs.matchCount).toBe(2);
  });

  it('counts the matches the byte cap kept out of the text, and says what it searched', async () => {
    const line = (index: number) => `2026-10-06T09:16:30.100Z #${index} BOOM ${'x'.repeat(60)}\n`;
    const body = Array.from({ length: 40 }, (_, i) => line(i)).join('');
    (clients.text as jest.Mock).mockResolvedValue(body);

    const logs = await read(clients, { pattern: 'BOOM', limitBytes: 300 });

    // Capping before the search would have answered "3 matches", which reads as "that is all there
    // was" — the one thing matchCount exists to rule out.
    expect(logs.matchCount).toBe(40);
    expect(logs.searched).toEqual({ lines: 40, bytes: body.length });
    expect(logs.bytes ?? logs.text.length).toBeLessThanOrEqual(300);
    expect(logs.bounded).toBe('limitBytes');
  });

  it('resumes after the window it searched, not after the last line that matched', async () => {
    (clients.text as jest.Mock).mockResolvedValue(
      '2026-10-06T09:14:21.882Z BOOM\n2026-10-06T09:15:00.000Z all quiet\n2026-10-06T09:16:30.100Z still quiet\n',
    );

    const logs = await read(clients, { pattern: 'BOOM' });

    // Resuming from the match would search the quiet lines again on the next call.
    expect(logs.latest).toBe('2026-10-06T09:16:30.100Z');
  });

  it('refuses a pattern that is not a regular expression, before the log is fetched', async () => {
    await expect(read(clients, { pattern: '([unclosed' })).rejects.toMatchObject({ status: 'malformed' });
    expect(clients.text).not.toHaveBeenCalled();
  });

  it('clamps tailLines over the ceiling and says it did', async () => {
    (clients.text as jest.Mock).mockResolvedValue('');

    const logs = await read(clients, { tailLines: MAX_TAIL_LINES * 10 });

    expect((clients.text as jest.Mock).mock.calls[0][1].tailLines).toBe(MAX_TAIL_LINES);
    expect(logs.bounded).toBe('tailLines');
  });

  it.each([
    ['a pod name that is a path', { pod: '../../secrets' }],
    ['a namespace that is a path', { namespace: '../kube-system' }],
    ['a pod name with a path separator', { pod: 'default/web-abc' }],
  ])('refuses %s', async (_, params) => {
    await expect(read(clients, params)).rejects.toMatchObject({ status: 'malformed' });
    expect(clients.text).not.toHaveBeenCalled();
  });

  it('never asks the API to follow, because a tool returns once', async () => {
    (clients.text as jest.Mock).mockResolvedValue('');

    await read(clients);

    const [path, query] = (clients.text as jest.Mock).mock.calls[0];
    expect(path).toBe('/api/v1/namespaces/default/pods/web-abc/log');
    expect(query).not.toHaveProperty('follow');
  });
});
