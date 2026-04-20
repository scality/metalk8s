import { useCallback, useEffect, useRef, useState } from 'react';
import { BubbleButton } from './BubbleButton';
import { Overlay } from './Overlay';

const GUARDIAN_ORIGIN =
  process.env.NODE_ENV === 'production'
    ? 'https://guardian.scality.com'
    : 'http://localhost:8080';

// How often to re-send MCP_DISCOVERY (Guardian's React app may mount after the iframe load event)
const DISCOVERY_INTERVAL_MS = 3000;

export const GuardianBubble = () => {
  const [isOpen, setIsOpen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const sendDiscovery = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    const tools = navigator.modelContext?.listTools?.() ?? [];
    iframe.contentWindow.postMessage(
      { type: 'MCP_DISCOVERY', tools },
      GUARDIAN_ORIGIN,
    );
  }, []);

  // On iframe load + on interval: send discovery (Guardian mounts asynchronously)
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    iframe.addEventListener('load', sendDiscovery);
    const interval = setInterval(sendDiscovery, DISCOVERY_INTERVAL_MS);

    return () => {
      iframe.removeEventListener('load', sendDiscovery);
      clearInterval(interval);
    };
  }, [sendDiscovery]);

  // Handle MCP_CALL messages from Guardian
  useEffect(() => {
    const handler = async (event: MessageEvent) => {
      if (event.origin !== GUARDIAN_ORIGIN) return;
      if (event.data?.type !== 'MCP_CALL') return;

      const payload = event.data.payload;
      const { id, params } = payload;
      const toolName = params?.name;
      const toolArgs = (params?.arguments ?? {}) as Record<string, unknown>;

      console.debug('[GuardianBubble] MCP_CALL received:', toolName, toolArgs);

      // Immediately acknowledge reception
      iframeRef.current?.contentWindow?.postMessage(
        { type: 'MCP_ACK', id },
        GUARDIAN_ORIGIN,
      );
      console.debug('[GuardianBubble] MCP_ACK sent for id:', id);

      const mc = navigator.modelContext;
      if (!mc?.callTool) {
        iframeRef.current?.contentWindow?.postMessage(
          {
            type: 'MCP_RESPONSE',
            id,
            error: { code: -32603, message: 'MCP server not initialized' },
          },
          GUARDIAN_ORIGIN,
        );
        console.warn('[GuardianBubble] navigator.modelContext.callTool not available');
        return;
      }

      try {
        const result = await mc.callTool({
          name: toolName,
          arguments: Object.keys(toolArgs).length > 0 ? toolArgs : undefined,
        });
        console.debug('[GuardianBubble] MCP_RESPONSE sent:', result);
        iframeRef.current?.contentWindow?.postMessage(
          { type: 'MCP_RESPONSE', id, result },
          GUARDIAN_ORIGIN,
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[GuardianBubble] Tool execution failed:', message);
        iframeRef.current?.contentWindow?.postMessage(
          {
            type: 'MCP_RESPONSE',
            id,
            error: { code: -32603, message },
          },
          GUARDIAN_ORIGIN,
        );
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  return (
    <>
      <Overlay iframeRef={iframeRef} isOpen={isOpen} url={GUARDIAN_ORIGIN} />
      <BubbleButton isOpen={isOpen} onClick={() => setIsOpen((v) => !v)} />
    </>
  );
};
