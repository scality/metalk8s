import { useRef } from 'react';
import { useShellConfig } from '../initFederation/ShellConfigProvider';
import { useGuardianDrawer } from './GuardianContext';
import { useDiscoveryEmitter, useMcpCallHandler } from './guardianPostMessageHooks';

const DRAWER_WIDTH = 500;

// Fallback Guardian origin for local development when shell config omits it.
const GUARDIAN_ORIGIN_FALLBACK = 'http://localhost:8080';

// Maps the shell product to the `source` value Guardian filters agents by:
// the lowercased product name with a `_ui` suffix (ARTESCA -> artesca_ui,
// RING -> ring_ui).
const sourceForProduct = (productName: string): string => `${productName.toLowerCase()}_ui`;

export const GuardianDrawer = () => {
  const { isOpen } = useGuardianDrawer();
  const { config } = useShellConfig();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Bare origin (no query): used for postMessage targeting and origin checks.
  const guardianOrigin = config.guardianOrigin || GUARDIAN_ORIGIN_FALLBACK;
  // iframe src carries the source suffix; the origin passed to the hooks does not.
  const iframeSrc = `${guardianOrigin}?source=${encodeURIComponent(sourceForProduct(config.productName))}`;

  useDiscoveryEmitter(iframeRef, guardianOrigin);
  useMcpCallHandler(iframeRef, guardianOrigin);

  return (
    <div
      style={{
        width: isOpen ? DRAWER_WIDTH : 0,
        height: '100%',
        overflow: 'hidden',
        transition: 'width 0.25s ease',
        borderLeft: isOpen ? '1px solid rgba(255,255,255,0.1)' : 'none',
        flexShrink: 0,
        isolation: 'isolate',
      }}
    >
      <iframe
        ref={iframeRef}
        src={iframeSrc}
        title="Guardian AI Assistant"
        style={{ width: DRAWER_WIDTH, height: '100%', border: 'none', background: '#000' }}
        allow="clipboard-write"
      />
    </div>
  );
};
