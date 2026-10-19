/**
 * Makes tool invocations visible in DevTools → Application → WebMCP → Tool Activity.
 *
 * The local relay injects a polyfill over `document.modelContext` (see useRelayEmbed) and mirrors
 * our REGISTRATIONS into the browser's native ModelContext — which is why the panel lists every
 * tool — but it then executes them itself, in page JS. The browser never sees an invocation, so
 * Tool Activity stays empty however many times a tool runs.
 *
 * Measured on one tab, wrapping both entry points: a call arriving from the relay fires only the
 * polyfill's `callTool`, while `native.executeTool` on the same tool fires `toolactivated` and
 * returns identical bytes. So this re-points execution at the mirror the polyfill already keeps,
 * and rebuilds the MCP envelope the relay expects back.
 *
 * Off unless asked for, because it changes which engine executes the tools: it bypasses the
 * polyfill's own validateToolInput / validateToolOutput, so tool arguments are no longer
 * schema-checked by it.
 *
 *   localStorage.setItem('webmcp.trace', '1')   // then reload
 *
 * Not a build-time check: the UI dev servers are routinely started with NODE_ENV=production, which
 * builds in `mode: 'production'` and dead-code-eliminates anything behind such a guard — the
 * tracing would silently never install on the setup that needs it.
 *
 * Background tasks are unaffected. MCPRegistrar enrols them from inside the `execute` it registers
 * (`isTaskHandle(ret)` → `registerHostTask`), and both engines call that same function.
 */

import type { ModelContextWithExtensions, ToolResponse } from '@mcp-b/webmcp-types';

type RegisteredTool = { name: string };

type NativeModelContext = {
  getTools: () => RegisteredTool[] | Promise<RegisteredTool[]>;
  // Takes the handle getTools() hands back — not a name — and the arguments as a JSON *string*.
  // Resolves to null when there is no result to report: @mcp-b/global's own shim path answers null
  // for a tool that returns nothing or whose call was cut short by navigation.
  executeTool: (tool: RegisteredTool, args: string) => Promise<string | null>;
};

/**
 * `callTool` takes ONE object — `{ name, arguments }`, the shape MCP puts on the wire. Its signature
 * is taken from the package rather than restated here, so it cannot drift from what callers actually
 * pass: an earlier version of this file declared a second `args` parameter that nothing passes, and
 * every natively routed tool silently ran with `{}`.
 */
export type PolyfilledModelContext = Pick<ModelContextWithExtensions, 'callTool'> & {
  native?: NativeModelContext;
  __isBrowserMcpServer?: boolean;
  __rerouted?: boolean;
};

const TAG = '[MCP]';
const OPT_IN_KEY = 'webmcp.trace';

// Same wording @mcp-b/global uses for this case, so a reader sees one message rather than two.
const NO_RESULT: ToolResponse = {
  content: [{ type: 'text', text: 'Tool execution interrupted by navigation' }],
  isError: true,
};

const isOptedIn = (): boolean => {
  try {
    return window.localStorage.getItem(OPT_IN_KEY) === '1';
  } catch {
    // Storage can be unavailable (private mode, blocked cookies); tracing is never worth throwing for.
    return false;
  }
};

/**
 * Is this already a tool response, rather than data to wrap in one?
 *
 * Every block is checked, not just the presence of a `content` array: a tool returning data that
 * happens to have a `content` key — a listing, a page body — would otherwise be mistaken for an
 * envelope and have its text block dropped. Content blocks carry a string `type`; arbitrary data
 * rarely does.
 */
const isToolResponse = (value: unknown): value is ToolResponse => {
  const content = (value as { content?: unknown } | null)?.content;
  return (
    !!value &&
    typeof value === 'object' &&
    Array.isArray(content) &&
    content.length > 0 &&
    content.every(
      (block) =>
        !!block && typeof block === 'object' && typeof (block as { type?: unknown }).type === 'string',
    )
  );
};

export const rerouteThroughNative = (polyfill: PolyfilledModelContext): boolean => {
  const native = polyfill.native;
  if (!native || polyfill.__rerouted) return false;

  const executeInPage = polyfill.callTool.bind(polyfill);

  polyfill.callTool = async (params) => {
    const { name } = params;
    try {
      // Failing to read the mirror is not fatal: no handle simply means the original engine runs it.
      // getTools is synchronous in Chrome today, so this has to catch a plain throw as well as a
      // rejection — `.catch()` alone would miss the former and surface it to the caller as an error.
      let tools: RegisteredTool[] = [];
      try {
        tools = await native.getTools();
      } catch {
        // Mirror unreadable; fall through to the page engine below.
      }
      const handle = Array.from(tools).find((candidate) => candidate.name === name);
      // Anything the polyfill did not mirror keeps the original path rather than failing, so
      // installing this can never take a tool offline.
      if (!handle) return executeInPage(params);

      // Executed once, here — never alongside the original path. This route carries every app's
      // mutating tools (deleteBucket, putObject) as well as the read-only ones, so running both
      // engines "to compare" would perform the operation twice.
      const text = await native.executeTool(handle, JSON.stringify(params.arguments ?? {}));

      // No result to report — a tool that returned nothing, or a call navigation cut short.
      // `String(null)` would otherwise answer a cheerful `"null"` with isError: false.
      if (text === null || text === undefined) return NO_RESULT;

      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        // A plain-text result rather than JSON; the text content below still carries it.
      }

      // A tool may answer with a finished envelope of its own instead of plain data. Wrapping that
      // again would bury it in `content[0].text` and, worse, stamp `isError: false` over a failure
      // the tool was reporting. No tool in any of the apps does this today -- it is reachable
      // because MCP allows a tool to return a CallToolResult directly.
      if (isToolResponse(parsed)) return parsed;

      // A string result can arrive JSON-quoted (`"hello"`) or raw (`hello`) depending on how the
      // mirror serialises it. Taking the parsed string when there is one yields `hello` either way,
      // which is what the page engine returns — so the text does not change when tracing is on.
      const structuredContent =
        parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : undefined;
      const content = typeof parsed === 'string' ? parsed : text;
      return { content: [{ type: 'text', text: content }], structuredContent, isError: false };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { content: [{ type: 'text', text: message }], isError: true };
    }
  };

  polyfill.__rerouted = true;
  return true;
};

/**
 * Installed from the registrar, which already holds the modelContext it resolved — so unlike a
 * tool-side version of this, there is nothing to wait for and no timer.
 */
export const traceToolActivity = (modelContext: unknown): void => {
  if (!isOptedIn()) return;
  const polyfill = modelContext as PolyfilledModelContext;
  if (!polyfill?.native) return;
  if (rerouteThroughNative(polyfill)) console.debug(`${TAG} tool calls are now traced`);
};
