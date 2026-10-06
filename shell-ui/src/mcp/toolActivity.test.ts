import {
  rerouteThroughNative,
  traceToolActivity,
  type PolyfilledModelContext,
} from './toolActivity';

/**
 * The re-route sits in front of every tool call every app registers, mutating ones included, so the
 * behaviour worth pinning is not "it traces" — it is that it stays faithful: one execution, the same
 * envelope back, and no tool taken offline when the mirror is incomplete.
 */

type Call = { name: string; args: string };

const polyfillWith = (
  mirroredToolNames: string[],
  execute: (call: Call) => Promise<string>,
) => {
  const inPageCalls: string[] = [];
  const nativeCalls: Call[] = [];

  const polyfill: PolyfilledModelContext = {
    __isBrowserMcpServer: true,
    native: {
      getTools: () => mirroredToolNames.map((name) => ({ name })),
      executeTool: (tool, args) => {
        nativeCalls.push({ name: tool.name, args });
        return execute({ name: tool.name, args });
      },
    },
    callTool: async (tool) => {
      inPageCalls.push(typeof tool === 'string' ? tool : (tool.name ?? ''));
      return { content: [{ type: 'text', text: 'from the page' }], isError: false };
    },
  };

  return { polyfill, inPageCalls, nativeCalls };
};

describe('rerouteThroughNative', () => {
  it('returns the native result in the envelope the relay expects', async () => {
    const payload = '{"Status":"Enabled","MFADelete":"Disabled"}';
    const { polyfill } = polyfillWith(['getBucketVersioning'], async () => payload);
    rerouteThroughNative(polyfill);

    const result = await polyfill.callTool({ name: 'getBucketVersioning' }, {});

    expect(result).toEqual({
      content: [{ type: 'text', text: payload }],
      structuredContent: { Status: 'Enabled', MFADelete: 'Disabled' },
      isError: false,
    });
  });

  it('runs the tool once, through the native engine only', async () => {
    const { polyfill, inPageCalls, nativeCalls } = polyfillWith(['createBucket'], async () => '{}');
    rerouteThroughNative(polyfill);

    await polyfill.callTool({ name: 'createBucket' }, { Bucket: 'b1' });

    // Running both engines "to compare" would create the bucket twice.
    expect(nativeCalls).toEqual([{ name: 'createBucket', args: '{"Bucket":"b1"}' }]);
    expect(inPageCalls).toEqual([]);
  });

  it('falls back to the page engine for a tool the mirror does not have', async () => {
    const { polyfill, inPageCalls, nativeCalls } = polyfillWith([], async () => '{}');
    rerouteThroughNative(polyfill);

    const result = await polyfill.callTool({ name: 'listBuckets' }, {});

    expect(inPageCalls).toEqual(['listBuckets']);
    expect(nativeCalls).toEqual([]);
    expect(result.content[0].text).toBe('from the page');
  });

  it('falls back to the page engine when the mirror cannot be read', async () => {
    const { polyfill, inPageCalls } = polyfillWith(['listBuckets'], async () => '{}');
    polyfill.native!.getTools = () => {
      throw new Error('native API went away');
    };
    rerouteThroughNative(polyfill);

    const result = await polyfill.callTool({ name: 'listBuckets' }, {});

    // Tracing is never worth failing a tool call for.
    expect(inPageCalls).toEqual(['listBuckets']);
    expect(result.isError).toBe(false);
  });

  it('keeps a non-JSON result as text rather than failing to parse it', async () => {
    const { polyfill } = polyfillWith(['getObject'], async () => 'plain log line');
    rerouteThroughNative(polyfill);

    const result = await polyfill.callTool({ name: 'getObject' }, {});

    expect(result.content[0].text).toBe('plain log line');
    expect(result.structuredContent).toBeUndefined();
    expect(result.isError).toBe(false);
  });

  it('reports a native failure as an MCP error instead of throwing at the relay', async () => {
    const { polyfill } = polyfillWith(['getBucketVersioning'], async () => {
      throw new Error('the endpoint did not answer');
    });
    rerouteThroughNative(polyfill);

    const result = await polyfill.callTool({ name: 'getBucketVersioning' }, {});

    expect(result).toEqual({
      content: [{ type: 'text', text: 'the endpoint did not answer' }],
      isError: true,
    });
  });

  it('does not wrap twice', async () => {
    const { polyfill, nativeCalls } = polyfillWith(['headBucket'], async () => '{}');

    expect(rerouteThroughNative(polyfill)).toBe(true);
    expect(rerouteThroughNative(polyfill)).toBe(false);

    await polyfill.callTool({ name: 'headBucket' }, {});
    expect(nativeCalls).toHaveLength(1);
  });

  it('does nothing when the polyfill has no native API to re-route to', () => {
    const { polyfill } = polyfillWith(['headBucket'], async () => '{}');

    expect(rerouteThroughNative({ ...polyfill, native: undefined })).toBe(false);
  });
});

describe('traceToolActivity', () => {
  afterEach(() => window.localStorage.removeItem('webmcp.trace'));

  it('leaves the context alone when the opt-in is absent', () => {
    const { polyfill } = polyfillWith(['headBucket'], async () => '{}');

    traceToolActivity(polyfill);

    expect(polyfill.__rerouted).toBeUndefined();
  });

  it('installs when the opt-in is set', () => {
    window.localStorage.setItem('webmcp.trace', '1');
    const { polyfill } = polyfillWith(['headBucket'], async () => '{}');

    traceToolActivity(polyfill);

    expect(polyfill.__rerouted).toBe(true);
  });

  it('does nothing on a native context, which needs no re-routing', () => {
    window.localStorage.setItem('webmcp.trace', '1');
    // A context with no `.native` is either the real API or something we do not understand; either
    // way there is no mirror to execute against.
    const nativeOnly = { callTool: async () => ({ content: [], isError: false }) };

    expect(() => traceToolActivity(nativeOnly)).not.toThrow();
  });

  it('survives being handed nothing at all', () => {
    window.localStorage.setItem('webmcp.trace', '1');

    expect(() => traceToolActivity(undefined)).not.toThrow();
  });
});
