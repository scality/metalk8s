import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { useShellConfig } from '../initFederation/ShellConfigProvider';

// Fallback Guardian origin for local development when shell config omits it.
const GUARDIAN_ORIGIN_FALLBACK = 'http://localhost:8080';

type GuardianDrawerContextValue = {
  isOpen: boolean;
  toggle: () => void;
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
  iframeRef: { current: null },
  guardianOrigin: GUARDIAN_ORIGIN_FALLBACK,
});

export const GuardianDrawerProvider = ({ children }: { children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);
  const { config } = useShellConfig();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Strip any trailing slash so it matches `event.origin` (which never has one)
  // in useMcpCallHandler's origin check.
  const guardianOrigin = (config.guardianOrigin || GUARDIAN_ORIGIN_FALLBACK).replace(/\/+$/, '');

  const value = useMemo(
    () => ({ isOpen, toggle, iframeRef, guardianOrigin }),
    [isOpen, toggle, guardianOrigin],
  );

  return (
    <GuardianDrawerContext.Provider value={value}>
      {children}
    </GuardianDrawerContext.Provider>
  );
};

export const useGuardianDrawer = () => useContext(GuardianDrawerContext);
