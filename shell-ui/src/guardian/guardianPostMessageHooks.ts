import type { ModelContextWithExtensions } from '@mcp-b/webmcp-types';
import { useCallback, useEffect } from 'react';

// How often to re-send MCP_DISCOVERY (Guardian's React app may mount after the iframe load event)
const DISCOVERY_INTERVAL_MS = 3000;

const PROMPT_RETRY_INTERVAL_MS = 500;
const PROMPT_DELIVERY_TIMEOUT_MS = 20000;

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

// Re-posted on an interval because nothing acknowledges delivery. The iframe is mounted with the
// drawer at startup, not on open, so by the time a button is clicked the assistant is usually
// listening and the first post lands; the repeats cover the click that beats its React tree to it.
// They are safe because the assistant acts on one question per promptId. It gives up rather than
// retrying for ever — a question arriving mid-conversation minutes later is worse than none.
export const usePromptEmitter = (
  iframeRef: React.RefObject<HTMLIFrameElement>,
  origin: string,
  pendingPrompt: { prompt: string; promptId: string } | null,
  onDelivered: () => void,
) => {
  useEffect(() => {
    if (!pendingPrompt) return;

    const post = () =>
      iframeRef.current?.contentWindow?.postMessage({ type: 'GUARDIAN_PROMPT', ...pendingPrompt }, origin);

    post();
    const interval = setInterval(post, PROMPT_RETRY_INTERVAL_MS);
    // The interval is cleared HERE, not left to the caller. `onDelivered` clearing the pending
    // prompt is what re-runs this effect today, so the bound only held because of what the caller
    // happens to do with it — a caller that did anything else would be posted at for ever.
    const timeout = setTimeout(() => {
      clearInterval(interval);
      onDelivered();
    }, PROMPT_DELIVERY_TIMEOUT_MS);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [iframeRef, origin, pendingPrompt, onDelivered]);
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
