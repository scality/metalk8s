import { createListKubeResourcesTool } from './tools/listKubeResourcesTool';
import type { ToolContext } from './types';

/**
 * Every MCP tool this app offers.
 *
 * shell-ui's registrar imports this module by the name declared under `spec.mcpTools` in
 * public/.well-known/micro-app-configuration, calls createTools once per registration pass, and
 * registers what comes back. Without that declaration the registrar skips the app in silence.
 */
export const createTools = (context: ToolContext) => [createListKubeResourcesTool(context)];
