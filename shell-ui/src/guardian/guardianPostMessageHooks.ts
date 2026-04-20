import { useCallback, useEffect } from "react";

export const GUARDIAN_ORIGIN =
  process.env.NODE_ENV === 'production'
    ? 'https://guardian.scality.com'
    : 'http://localhost:8080';

// How often to re-send MCP_DISCOVERY (Guardian's React app may mount after the iframe load event)
const DISCOVERY_INTERVAL_MS = 3000;

export const useDiscoveryEmitter = (iframeRef: React.RefObject<HTMLIFrameElement>) => {
  // biome-ignore lint/correctness/useExhaustiveDependencies: useRef dependency
  const sendDiscovery = useCallback(() => {
    const tools = navigator.modelContext?.listTools?.() ?? [];
    iframeRef.current?.contentWindow?.postMessage?.(
      { type: 'MCP_DISCOVERY', tools },
      GUARDIAN_ORIGIN,
    );
  }, []);

  useEffect(() => {
    const interval = setInterval(sendDiscovery, DISCOVERY_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [sendDiscovery]);
}

export const useMcpCallHandler = (iframeRef: React.RefObject<HTMLIFrameElement>) => {
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
    iframeRef.current?.contentWindow?.postMessage(message, GUARDIAN_ORIGIN);
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: useRef dependency
  useEffect(() => {
    const handler = async (event: MessageEvent) => {
      if (event.origin !== GUARDIAN_ORIGIN) return;
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
      iframeRef.current?.contentWindow?.postMessage(
        { type: 'MCP_ACK', id },
        GUARDIAN_ORIGIN,
      );

      try {
        const result = await navigator?.modelContext?.callTool?.(params);
        postResponse(id, result);
      } catch (err) {
        console.error('[GuardianBubble] Tool execution failed:', err);
        postResponse(id, null, { code: 1, message: err.toString() });
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);
}