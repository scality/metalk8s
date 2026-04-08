import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MOCK_MCP_TOOLS } from './mockMcpTools';

const GUARDIAN_URL = 'http://localhost:8080';
const GUARDIAN_ORIGIN = 'http://localhost:8080';

// How often to re-send MCP_DISCOVERY (Guardian's React app may mount after the iframe load event)
const DISCOVERY_INTERVAL_MS = 3000;

// BrowserMcpServer (navigator.modelContext after @mcp-b/global init) exposes callTool at runtime.
// TypeScript types modelContext as ModelContextCore (strict core only) so we cast here.
type RuntimeModelContext = typeof navigator.modelContext & {
  callTool: (params: {
    name: string;
    arguments?: Record<string, unknown>;
  }) => Promise<unknown>;
};

type JsonRpcToolCallPayload = {
  jsonrpc: string;
  id: string | number;
  method: string;
  params: {
    name: string;
    arguments: Record<string, unknown>;
  };
};

const BubbleButton = ({
  isOpen,
  onClick,
}: {
  isOpen: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    title={isOpen ? 'Close Guardian assistant' : 'Open Guardian assistant'}
    style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 10000,
      width: '56px',
      height: '56px',
      borderRadius: '50%',
      background: isOpen
        ? 'linear-gradient(135deg, #444, #222)'
        : 'linear-gradient(135deg, #0c6dfd, #0044bb)',
      border: 'none',
      cursor: 'pointer',
      boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'background 0.2s, transform 0.15s',
      color: '#fff',
      fontSize: '22px',
    }}
  >
    {isOpen ? '✕' : '✦'}
  </button>
);

const Overlay = ({
  iframeRef,
  isOpen,
}: {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  isOpen: boolean;
}) => (
  <div
    style={{
      position: 'fixed',
      bottom: '92px',
      right: '24px',
      zIndex: 9999,
      width: '600px',
      height: '600px',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 12px 48px rgba(0,0,0,0.6)',
      display: isOpen ? 'flex' : 'none',
      flexDirection: 'column',
      border: '1px solid rgba(255,255,255,0.1)',
    }}
  >
    <iframe
      ref={iframeRef}
      src={GUARDIAN_URL}
      title="Guardian AI Assistant"
      style={{ width: '100%', height: '100%', border: 'none', background: '#000' }}
      allow="clipboard-write"
    />
  </div>
);

export const GuardianBubble: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Send MCP_DISCOVERY to the iframe
  const sendDiscovery = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage(
      { type: 'MCP_DISCOVERY', tools: MOCK_MCP_TOOLS },
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
  }, [sendDiscovery, isOpen]); // re-run when overlay opens so the ref is attached

  // Handle MCP_CALL messages from Guardian
  useEffect(() => {
    const handler = async (event: MessageEvent) => {
      if (event.origin !== GUARDIAN_ORIGIN) return;
      if (event.data?.type !== 'MCP_CALL') return;

      const payload = event.data.payload as JsonRpcToolCallPayload;
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

      // Execute via navigator.modelContext.callTool() — routes through the BrowserMcpServer
      // registered in @mcp-b/global, which calls execute() and wraps the result as CallToolResult.
      const mc = navigator.modelContext as unknown as RuntimeModelContext;
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
      <Overlay iframeRef={iframeRef} isOpen={isOpen} />
      <BubbleButton isOpen={isOpen} onClick={() => setIsOpen((v) => !v)} />
    </>
  );
};
