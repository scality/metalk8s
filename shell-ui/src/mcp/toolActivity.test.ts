import type { ToolResponse } from '@mcp-b/webmcp-types';
import {
  rerouteThroughNative,
  traceToolActivity,
  type PolyfilledModelContext,
} from './toolActivity';

/**
 * The re-route sits in front of every tool call every app registers, mutating ones included, so the
 * behaviour worth pinning is not "it traces" — it is that it stays faithful: the arguments arrive,
 * one execution happens, the same envelope comes back, and no tool is taken offline when the mirror
 * is incomplete.
 *
 * Every call here uses the real `callTool({ name, arguments })` shape. The first version of these
 * tests invented a second `args` parameter, which made them pass against a signature no caller uses
 * while real calls lost their arguments.
 */

type Call = { name: string; args: string };

const textOf = (result: ToolResponse): string | undefined => {
  const block = result.content?.[0];
  return block && 'text' in block ? (block.text as string) : undefined;
};

const polyfillWith = (
  mirroredToolNames: string[],
  execute: (call: Call) => Promise<string>,
) => {
  const inPageCalls: Call[] = [];
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
    callTool: async (params) => {
      inPageCalls.push({ name: params.name, args: JSON.stringify(params.arguments ?? {}) });
      return { content: [{ type: 'text', text: 'from the page' }], isError: false };
    },
  };

  return { polyfill, inPageCalls, nativeCalls };
};

describe('rerouteThroughNative', () => {
  it('hands the arguments to the native engine', async () => {
    const { polyfill, nativeCalls } = polyfillWith(['createBucket'], async () => '{}');
    rerouteThroughNative(polyfill);

    await polyfill.callTool({ name: 'createBucket', arguments: { Bucket: 'b1' } });

    // The whole point: a bucket name that does not survive the hop creates the wrong bucket.
    expect(nativeCalls).toEqual([{ name: 'createBucket', args: '{"Bucket":"b1"}' }]);
  });

  it('sends an empty object for a tool called with no arguments', async () => {
    const { polyfill, nativeCalls } = polyfillWith(['listBuckets'], async () => '{}');
    rerouteThroughNative(polyfill);

    await polyfill.callTool({ name: 'listBuckets' });

    expect(nativeCalls).toEqual([{ name: 'listBuckets', args: '{}' }]);
  });

  it('returns the native result in the envelope the caller expects', async () => {
    const payload = '{"Status":"Enabled","MFADelete":"Disabled"}';
    const { polyfill } = polyfillWith(['getBucketVersioning'], async () => payload);
    rerouteThroughNative(polyfill);

    const result = await polyfill.callTool({ name: 'getBucketVersioning' });

    expect(result).toEqual({
      content: [{ type: 'text', text: payload }],
      structuredContent: { Status: 'Enabled', MFADelete: 'Disabled' },
      isError: false,
    });
  });

  it('runs the tool once, through the native engine only', async () => {
    const { polyfill, inPageCalls, nativeCalls } = polyfillWith(['deleteBucket'], async () => '{}');
    rerouteThroughNative(polyfill);

    await polyfill.callTool({ name: 'deleteBucket', arguments: { Bucket: 'b1' } });

    // Running both engines "to compare" would delete the bucket twice.
    expect(nativeCalls).toHaveLength(1);
    expect(inPageCalls).toEqual([]);
  });

  it('falls back to the page engine for a tool the mirror does not have, arguments included', async () => {
    const { polyfill, inPageCalls, nativeCalls } = polyfillWith([], async () => '{}');
    rerouteThroughNative(polyfill);

    const result = await polyfill.callTool({ name: 'putObject', arguments: { Key: 'k' } });

    expect(inPageCalls).toEqual([{ name: 'putObject', args: '{"Key":"k"}' }]);
    expect(nativeCalls).toEqual([]);
    expect(textOf(result)).toBe('from the page');
  });

  it('falls back to the page engine when the mirror cannot be read', async () => {
    const { polyfill, inPageCalls } = polyfillWith(['listBuckets'], async () => '{}');
    polyfill.native!.getTools = () => {
      throw new Error('native API went away');
    };
    rerouteThroughNative(polyfill);

    const result = await polyfill.callTool({ name: 'listBuckets' });

    // Tracing is never worth failing a tool call for.
    expect(inPageCalls.map((call) => call.name)).toEqual(['listBuckets']);
    expect(result.isError).toBe(false);
  });

  it('keeps a non-JSON result as text rather than failing to parse it', async () => {
    const { polyfill } = polyfillWith(['getObject'], async () => 'plain log line');
    rerouteThroughNative(polyfill);

    const result = await polyfill.callTool({ name: 'getObject' });

    expect(textOf(result)).toBe('plain log line');
    expect(result.structuredContent).toBeUndefined();
    expect(result.isError).toBe(false);
  });

  it('reports a native failure as an MCP error instead of throwing at the caller', async () => {
    const { polyfill } = polyfillWith(['getBucketVersioning'], async () => {
      throw new Error('the endpoint did not answer');
    });
    rerouteThroughNative(polyfill);

    const result = await polyfill.callTool({ name: 'getBucketVersioning' });

    expect(result).toEqual({
      content: [{ type: 'text', text: 'the endpoint did not answer' }],
      isError: true,
    });
  });

  it('does not wrap twice', async () => {
    const { polyfill, nativeCalls } = polyfillWith(['headBucket'], async () => '{}');

    expect(rerouteThroughNative(polyfill)).toBe(true);
    expect(rerouteThroughNative(polyfill)).toBe(false);

    await polyfill.callTool({ name: 'headBucket' });
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

  it('does nothing on a context with no mirror to execute against', () => {
    window.localStorage.setItem('webmcp.trace', '1');

    expect(() => traceToolActivity({ callTool: async () => ({ content: [] }) })).not.toThrow();
  });

  it('survives being handed nothing at all', () => {
    window.localStorage.setItem('webmcp.trace', '1');

    expect(() => traceToolActivity(undefined)).not.toThrow();
  });
});
