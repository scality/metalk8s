import type { ModelContextWithExtensions } from '@mcp-b/webmcp-types';
import { useCallback, useEffect } from 'react';

// How often to re-send MCP_DISCOVERY (Guardian's React app may mount after the iframe load event)
const DISCOVERY_INTERVAL_MS = 3000;

// Both hooks take the Guardian `origin` (scheme + host + port, no query string)
// sourced from shell config. It is used as the postMessage target origin and to
// validate inbound message origins, so it must stay query-string-free even when
// the iframe src carries a `?source=` suffix.
export const useDiscoveryEmitter = (iframeRef: React.RefObject<HTMLIFrameElement>, origin: string) => {
  // biome-ignore lint/correctness/useExhaustiveDependencies: useRef dependency
  const sendDiscovery = useCallback(() => {
    // Chrome 150 moved modelContext from navigator to document; navigator is a
    // deprecated alias. https://github.com/webmachinelearning/webmcp/pull/184
    const modelContext = document.modelContext || navigator.modelContext;
    const tools = (modelContext as ModelContextWithExtensions)?.listTools?.() ?? [];
    iframeRef.current?.contentWindow?.postMessage?.({ type: 'MCP_DISCOVERY', tools }, origin);
  }, [origin]);

  useEffect(() => {
    const interval = setInterval(sendDiscovery, DISCOVERY_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [sendDiscovery]);
};

export const useMcpCallHandler = (iframeRef: React.RefObject<HTMLIFrameElement>, origin: string) => {
  const postResponse = (id: string, response: unknown, error?: { code: number; message: string }) => {
    // biome-ignore lint/suspicious/noExplicitAny: it's postMessage arg type
    const message: any = { type: 'MCP_RESPONSE', id };
    if (error) {
      console.error('[GuardianBubble] Tool execution failed:', error.message);
      message.error = error;
    } else {
      console.debug('[GuardianBubble] MCP_RESPONSE sent:', response);
      message.result = response;
    }
    iframeRef.current?.contentWindow?.postMessage(message, origin);
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: useRef dependency
  useEffect(() => {
    const handler = async (event: MessageEvent) => {
      if (event.origin !== origin) return;
      if (event.data?.type !== 'MCP_CALL') return;

      const payload = event.data.payload;

      if (typeof payload?.id !== 'string' || typeof payload?.params !== 'object') {
        console.warn('[GuardianBubble] Invalid MCP_CALL payload:', payload);
        return;
      }
      const { id, params } = payload;

      if (!params?.name) {
        postResponse(id, null, { code: -32602, message: 'Invalid params: missing tool name' });
        return;
      }
      console.info('[GuardianBubble] MCP_CALL received:', params);

      // Immediately acknowledge reception
      console.debug('[GuardianBubble] MCP_ACK sent for id:', id);
      iframeRef.current?.contentWindow?.postMessage({ type: 'MCP_ACK', id }, origin);

      try {
        const modelContext = document.modelContext || navigator.modelContext;
        const result = await (modelContext as ModelContextWithExtensions)?.callTool?.(params);
        postResponse(id, result);
      } catch (err) {
        console.error('[GuardianBubble] Tool execution failed:', err);
        postResponse(id, null, { code: 1, message: String(err) });
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [origin]);
};
