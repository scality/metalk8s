import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useShellConfig } from '../initFederation/ShellConfigProvider';

// Fallback Guardian origin for local development when shell config omits it.
const GUARDIAN_ORIGIN_FALLBACK = 'http://localhost:8080';

export type PendingPrompt = { prompt: string; promptId: string };

type GuardianDrawerContextValue = {
  isOpen: boolean;
  toggle: () => void;
  /** Separate from `toggle`, which would CLOSE an already-open drawer. */
  open: () => void;
  /** A question waiting for the iframe, cleared once delivered. */
  pendingPrompt: PendingPrompt | null;
  setPendingPrompt: (prompt: PendingPrompt) => void;
  clearPendingPrompt: () => void;
  /**
   * Ref to the Guardian iframe. Owned here rather than by GuardianDrawer so it
   * can be reached from elsewhere in the tree (e.g. MCPRegistrar, outside the drawer).
   */
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  /**
   * Bare origin (no query string, no trailing slash): used as the postMessage
   * target origin and to validate inbound message origins.
   */
  guardianOrigin: string;
};

const GuardianDrawerContext = createContext<GuardianDrawerContextValue>({
  isOpen: false,
  toggle: () => {},
  open: () => {},
  pendingPrompt: null,
  setPendingPrompt: () => {},
  clearPendingPrompt: () => {},
  iframeRef: { current: null },
  guardianOrigin: GUARDIAN_ORIGIN_FALLBACK,
});

// Apart from the drawer's context, the setter in a context of its own: a page handing over its
// background must re-render the drawer only, not the navbar, which would remount the page.
const AssistantBackgroundContext = createContext<string | null>(null);
const SetAssistantBackgroundContext = createContext<(background: string | null) => void>(() => {});

export const GuardianDrawerProvider = ({ children }: { children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);
  const open = useCallback(() => setIsOpen(true), []);
  const [pendingPrompt, setPendingPrompt] = useState<PendingPrompt | null>(null);
  const clearPendingPrompt = useCallback(() => setPendingPrompt(null), []);
  const [assistantBackground, setAssistantBackground] = useState<string | null>(null);

  const { config } = useShellConfig();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Strip any trailing slash so it matches `event.origin` (which never has one)
  // in useMcpCallHandler's origin check.
  const guardianOrigin = (config.guardianOrigin || GUARDIAN_ORIGIN_FALLBACK).replace(/\/+$/, '');

  const value = useMemo(
    () => ({ isOpen, toggle, open, pendingPrompt, setPendingPrompt, clearPendingPrompt, iframeRef, guardianOrigin }),
    [isOpen, toggle, open, pendingPrompt, clearPendingPrompt, guardianOrigin],
  );

  return (
    <GuardianDrawerContext.Provider value={value}>
      <SetAssistantBackgroundContext.Provider value={setAssistantBackground}>
        <AssistantBackgroundContext.Provider value={assistantBackground}>
          {children}
        </AssistantBackgroundContext.Provider>
      </SetAssistantBackgroundContext.Provider>
    </GuardianDrawerContext.Provider>
  );
};

export const useGuardianDrawer = () => useContext(GuardianDrawerContext);

/**
 * Open the assistant on a question, for an application mounted in the shell.
 *
 * Exposed through useShellHooks because the applications cannot reach the iframe: the shell owns
 * it, its origin, and whether the drawer is open.
 */
export const useAskAssistant = () => {
  const { open, setPendingPrompt } = useGuardianDrawer();
  const { config } = useShellConfig();
  // GuardianDrawer is only mounted when canUseGuardian is set, and the drawer owns the hook that
  // posts to the iframe. Without it `ask` would open nothing and leave a question in the context
  // that no one ever sends — so say so, and let the caller hide its button.
  const isAvailable = Boolean(config.guardianOrigin && config.canUseGuardian);

  const ask = useCallback(
    (prompt: string, promptId?: string) => {
      const asked = prompt.trim();
      if (!isAvailable || !asked) return;
      open();
      setPendingPrompt({ prompt: asked, promptId: promptId || asked });
    },
    [isAvailable, open, setPendingPrompt],
  );

  return { ask, isAvailable };
};

/**
 * Paint `background` behind the assistant while the calling page is mounted, for a page whose own
 * background should carry on under the drawer. Laid out against the window
 * (`background-attachment: fixed`), so the page paints the same value fixed too and the two meet
 * seamlessly. Only drawers that let the page show through Guardian (ARTESCA's) use it.
 *
 * Exposed through useShellHooks: the drawer sits beside the application, out of its reach.
 */
export const useAssistantBackground = (background: string) => {
  const setAssistantBackground = useContext(SetAssistantBackgroundContext);
  useEffect(() => {
    setAssistantBackground(background);
    return () => setAssistantBackground(null);
  }, [background, setAssistantBackground]);
};

/** The background the page on screen handed over, for the drawer to paint. */
export const useHandedAssistantBackground = () => useContext(AssistantBackgroundContext);
