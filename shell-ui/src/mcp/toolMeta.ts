// @mcp-b 3 and the WebMCP draft both drop `_meta`, so the shell keeps a tool's Guardian hints by
// name and puts them back, as MCP `_meta`, on the tools it announces to the assistant.
const ENTRYPOINT_KEY = 'scality.guardian/entrypoint';
const REVEALS_KEY = 'scality.guardian/reveals';

/** How a micro-app's tool asks Guardian to offer it; the shell owns how that reaches Guardian. */
export type GuardianHints = {
  /** Offered to the assistant up front, rather than left for it to search. */
  entrypoint?: boolean;
  /** Tools offered to the assistant once this one has succeeded. */
  reveals?: string[];
};

const metaByToolName = new Map<string, Record<string, unknown>>();

export const rememberGuardianHints = (
  name: string,
  { entrypoint, reveals }: GuardianHints,
  signal: AbortSignal,
) => {
  const meta = {
    ...(entrypoint && { [ENTRYPOINT_KEY]: true }),
    ...(reveals && reveals.length > 0 && { [REVEALS_KEY]: reveals }),
  };
  if (Object.keys(meta).length === 0) return;
  metaByToolName.set(name, meta);
  signal.addEventListener('abort', () => {
    if (metaByToolName.get(name) === meta) metaByToolName.delete(name);
  });
};

export const withToolMeta = <TTool extends { name: string }>(tools: TTool[]) =>
  tools.map((tool) => {
    const meta = metaByToolName.get(tool.name);
    return meta ? { ...tool, _meta: meta } : tool;
  });
