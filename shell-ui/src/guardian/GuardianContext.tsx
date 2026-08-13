import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { useShellConfig } from '../initFederation/ShellConfigProvider';

// Fallback Guardian origin for local development when shell config omits it.
const GUARDIAN_ORIGIN_FALLBACK = 'http://localhost:8080';

type GuardianDrawerContextValue = {
  isOpen: boolean;
  toggle: () => void;
  /**
   * Ref to the Guardian iframe. Owned here rather than by GuardianDrawer so
   * that `notify` can reach the iframe even though it is consumed elsewhere
   * (MCPRegistrar, which sits outside the drawer in the tree).
   */
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  /**
   * Bare origin (no query string, no trailing slash): used as the postMessage
   * target origin and to validate inbound message origins.
   */
  guardianOrigin: string;
  /**
   * Push a one-off message into the Guardian chat.
   *
   * WebMCP is strictly request/response: a tool CANNOT write into the chat once
   * its `execute()` has returned. A tool whose work finishes in the BACKGROUND
   * calls this to post an `MCP_NOTIFICATION` to the Guardian iframe, which
   * appends the message to the chat as an assistant message.
   *
   * shell-ui hands it to every federated app through `ToolContext.notify`, so
   * tools never touch postMessage or the iframe themselves.
   */
  notify: (message: string) => void;
};

const GuardianDrawerContext = createContext<GuardianDrawerContextValue>({
  isOpen: false,
  toggle: () => {},
  iframeRef: { current: null },
  guardianOrigin: GUARDIAN_ORIGIN_FALLBACK,
  notify: () => {},
});

export const GuardianDrawerProvider = ({ children }: { children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);
  const { config } = useShellConfig();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Strip any trailing slash so it matches `event.origin` (which never has one)
  // in useMcpCallHandler's origin check.
  const guardianOrigin = (config.guardianOrigin || GUARDIAN_ORIGIN_FALLBACK).replace(/\/+$/, '');

  const notify = useCallback(
    (message: string) => {
      iframeRef.current?.contentWindow?.postMessage(
        { type: 'MCP_NOTIFICATION', notification: { message } },
        guardianOrigin,
      );
    },
    [guardianOrigin],
  );

  const value = useMemo(
    () => ({ isOpen, toggle, iframeRef, guardianOrigin, notify }),
    [isOpen, toggle, guardianOrigin, notify],
  );

  return (
    <GuardianDrawerContext.Provider value={value}>
      {children}
    </GuardianDrawerContext.Provider>
  );
};

export const useGuardianDrawer = () => useContext(GuardianDrawerContext);

/** Stable across renders — safe to put straight into a ToolContext. */
export const useGuardianNotify = () => useContext(GuardianDrawerContext).notify;
