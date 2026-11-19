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

type Call = { name: string; args: unknown };

const textOf = (result: ToolResponse): string | undefined => {
  const block = result.content?.[0];
  return block && 'text' in block ? (block.text as string) : undefined;
};

const polyfillWith = (
  mirroredToolNames: string[],
  execute: (call: Call) => Promise<string | null>,
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
      inPageCalls.push({ name: params.name, args: params.arguments ?? {} });
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

    // The whole point: a bucket name that does not survive the hop creates the wrong bucket. The
    // arguments go over as an object — Chrome took a JSON string here until 155 and refuses one now.
    expect(nativeCalls).toEqual([{ name: 'createBucket', args: { Bucket: 'b1' } }]);
  });

  it('sends an empty object for a tool called with no arguments', async () => {
    const { polyfill, nativeCalls } = polyfillWith(['listBuckets'], async () => '{}');
    rerouteThroughNative(polyfill);

    await polyfill.callTool({ name: 'listBuckets' });

    expect(nativeCalls).toEqual([{ name: 'listBuckets', args: {} }]);
  });

  it('sends the JSON string a Chrome before 155 asks for, and only then', async () => {
    // Up to 154 the object is refused with this message, and the tool never runs. The arguments
    // have to survive that hop too: the whole point of the retry is the second shape working.
    const { polyfill, nativeCalls, inPageCalls } = polyfillWith(['createBucket'], async ({ args }) =>
      typeof args === 'string' ? '"made it"' : Promise.reject(new Error('Failed to parse input arguments')),
    );
    rerouteThroughNative(polyfill);

    const result = await polyfill.callTool({ name: 'createBucket', arguments: { Bucket: 'b1' } });

    expect(nativeCalls).toEqual([
      { name: 'createBucket', args: { Bucket: 'b1' } },
      { name: 'createBucket', args: '{"Bucket":"b1"}' },
    ]);
    expect(inPageCalls).toEqual([]);
    expect(textOf(result)).toBe('made it');
  });

  it('does not re-run a tool that failed on the second shape either', async () => {
    // The object was refused, so the string ran the tool — and the tool threw. Falling back to the
    // page here would delete the bucket a second time.
    const { polyfill, inPageCalls, nativeCalls } = polyfillWith(['deleteBucket'], async ({ args }) => {
      throw new Error(
        typeof args === 'string' ? 'the bucket is not empty' : 'Failed to parse input arguments',
      );
    });
    rerouteThroughNative(polyfill);

    const result = await polyfill.callTool({ name: 'deleteBucket', arguments: { Bucket: 'b1' } });

    expect(nativeCalls).toHaveLength(2);
    expect(inPageCalls).toEqual([]);
    expect(result.isError).toBe(true);
    expect(textOf(result)).toBe('the bucket is not empty');
  });

  it('reads the reason off a rejection that is not an Error', async () => {
    // The relay rejects with a plain `{ message }` on some paths, and String()-ing that object
    // alone yields "[object Object]" — a refusal nobody would recognise, and no retry.
    const { polyfill, nativeCalls } = polyfillWith(['listBuckets'], async ({ args }) => {
      if (typeof args === 'string') return '"made it"';
      throw { message: 'Failed to parse input arguments' };
    });
    rerouteThroughNative(polyfill);

    const result = await polyfill.callTool({ name: 'listBuckets' });

    expect(nativeCalls).toHaveLength(2);
    expect(textOf(result)).toBe('made it');
  });

  it('does not read a tool failure wearing the binding prefix as a refusal', async () => {
    // Chrome puts "Failed to execute … on 'ModelContext'" in front of everything that leaves this
    // method, a tool's own exception included. Taking that as a refusal would retry the call, be
    // refused on the second shape, fall back to the page — and delete the bucket twice.
    const { polyfill, inPageCalls, nativeCalls } = polyfillWith(['deleteBucket'], async () => {
      throw new Error("Failed to execute 'executeTool' on 'ModelContext': the bucket is not empty");
    });
    rerouteThroughNative(polyfill);

    const result = await polyfill.callTool({ name: 'deleteBucket', arguments: { Bucket: 'b1' } });

    expect(nativeCalls).toHaveLength(1);
    expect(inPageCalls).toEqual([]);
    expect(result.isError).toBe(true);
  });

  it('runs the tool in the page when neither shape is taken', async () => {
    // A third signature nobody has seen yet. Tracing is worth losing; the tools are not.
    const { polyfill, inPageCalls, nativeCalls } = polyfillWith(['listBuckets'], async () => {
      throw new TypeError(
        "Failed to execute 'executeTool' on 'ModelContext': invalid input object: value is not an object",
      );
    });
    rerouteThroughNative(polyfill);

    const result = await polyfill.callTool({ name: 'listBuckets' });

    expect(nativeCalls).toHaveLength(2);
    expect(inPageCalls).toEqual([{ name: 'listBuckets', args: {} }]);
    expect(textOf(result)).toBe('from the page');
  });

  it('does not re-run a tool that failed after it had already run', async () => {
    // The tool itself threw, so it may well have done its work. Retrying the other shape, or
    // running it again in the page, would make a mutating call twice.
    const { polyfill, inPageCalls, nativeCalls } = polyfillWith(['deleteBucket'], async () => {
      throw new Error('the bucket is not empty');
    });
    rerouteThroughNative(polyfill);

    const result = await polyfill.callTool({ name: 'deleteBucket', arguments: { Bucket: 'b1' } });

    expect(nativeCalls).toHaveLength(1);
    expect(inPageCalls).toEqual([]);
    expect(result.isError).toBe(true);
    expect(textOf(result)).toBe('the bucket is not empty');
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

    expect(inPageCalls).toEqual([{ name: 'putObject', args: { Key: 'k' } }]);
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

  it('passes through a tool that answered with an envelope of its own', async () => {
    const envelope = { content: [{ type: 'text', text: 'could not reach the node' }], isError: true };
    const { polyfill } = polyfillWith(['getObject'], async () => JSON.stringify(envelope));
    rerouteThroughNative(polyfill);

    const result = await polyfill.callTool({ name: 'getObject' });

    // Re-wrapping would bury this in content[0].text and stamp isError: false over the failure.
    expect(result).toEqual(envelope);
  });

  it('still wraps data that merely has a content key', async () => {
    // The reason the envelope check inspects every block rather than just the array: this is data,
    // not a tool response, and dropping its text block would lose the result.
    const data = { content: ['first.txt', 'second.txt'], truncated: false };
    const { polyfill } = polyfillWith(['listObjects'], async () => JSON.stringify(data));
    rerouteThroughNative(polyfill);

    const result = await polyfill.callTool({ name: 'listObjects' });

    expect(result.structuredContent).toEqual(data);
    expect(textOf(result)).toBe(JSON.stringify(data));
    expect(result.isError).toBe(false);
  });

  it('reports an absent result as an error, not as a successful "null"', async () => {
    const { polyfill } = polyfillWith(['navigateToRoute'], async () => null);
    rerouteThroughNative(polyfill);

    const result = await polyfill.callTool({ name: 'navigateToRoute' });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toBe('Tool execution interrupted by navigation');
  });

  it('unquotes a string result, so the text is the same as the page engine returns', async () => {
    // A plain string can come back JSON-quoted depending on how the mirror serialises it; the page
    // engine would have returned `done`, and tracing must not change what the caller reads.
    const { polyfill } = polyfillWith(['headBucket'], async () => JSON.stringify('done'));
    rerouteThroughNative(polyfill);

    const result = await polyfill.callTool({ name: 'headBucket' });

    expect(textOf(result)).toBe('done');
    expect(result.structuredContent).toBeUndefined();
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
