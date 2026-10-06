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

type RegisteredTool = { name: string };

type NativeModelContext = {
  getTools: () => RegisteredTool[] | Promise<RegisteredTool[]>;
  // Takes the handle getTools() hands back — not a name — and the arguments as a JSON *string*.
  executeTool: (tool: RegisteredTool, args: string) => Promise<string>;
};

type McpToolResult = {
  content: { type: 'text'; text: string }[];
  structuredContent?: unknown;
  isError: boolean;
};

export type PolyfilledModelContext = {
  callTool: (tool: { name?: string } | string, args: unknown) => Promise<McpToolResult>;
  native?: NativeModelContext;
  __isBrowserMcpServer?: boolean;
  __rerouted?: boolean;
};

const TAG = '[MCP]';
const OPT_IN_KEY = 'webmcp.trace';

const isOptedIn = (): boolean => {
  try {
    return window.localStorage.getItem(OPT_IN_KEY) === '1';
  } catch {
    // Storage can be unavailable (private mode, blocked cookies); tracing is never worth throwing for.
    return false;
  }
};

export const rerouteThroughNative = (polyfill: PolyfilledModelContext): boolean => {
  const native = polyfill.native;
  if (!native || polyfill.__rerouted) return false;

  const executeInPage = polyfill.callTool.bind(polyfill);

  polyfill.callTool = async (tool, args) => {
    const name = typeof tool === 'string' ? tool : tool?.name;
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
      if (!handle) return executeInPage(tool, args);

      // Executed once, here — never alongside the original path. This route carries every app's
      // mutating tools (deleteBucket, putObject) as well as the read-only ones, so running both
      // engines "to compare" would perform the operation twice.
      const text = await native.executeTool(
        handle,
        typeof args === 'string' ? args : JSON.stringify(args ?? {}),
      );

      let structuredContent: unknown;
      try {
        const parsed: unknown = JSON.parse(text);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) structuredContent = parsed;
      } catch {
        // A plain-text result rather than JSON; the text content below still carries it.
      }
      return { content: [{ type: 'text', text: String(text) }], structuredContent, isError: false };
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
