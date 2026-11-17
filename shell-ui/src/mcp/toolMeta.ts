// @mcp-b 3 drops `_meta` both at registerTool and in listTools, so the shell keeps it by tool name
// and puts it back on the tools it announces to the assistant.
const metaByToolName = new Map<string, Record<string, unknown>>();

export const rememberToolMeta = (name: string, meta: Record<string, unknown>, signal: AbortSignal) => {
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
