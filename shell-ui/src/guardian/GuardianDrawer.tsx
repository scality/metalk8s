import type { RefObject } from 'react';
import { useShellConfig } from '../initFederation/ShellConfigProvider';
import { ArtescaGuardianDrawer } from './artesca/ArtescaGuardianDrawer';
import { useGuardianDrawer } from './GuardianContext';
import { useDiscoveryEmitter, useMcpCallHandler, usePromptEmitter } from './guardianPostMessageHooks';

const DRAWER_WIDTH = 500;

const ARTESCA_GUARDIAN_SOURCE = 'artesca_ui';

/** What every drawer variant sets on the iframe; the variant owns its size and style. */
export type GuardianFrameProps = {
  ref: RefObject<HTMLIFrameElement | null>;
  src: string;
  title: string;
  allow: string;
};

// Maps the shell product to the `source` value Guardian filters agents by:
// the lowercased product name with a `_ui` suffix (ARTESCA -> artesca_ui,
// RING -> ring_ui).
const sourceForProduct = (productName: string): string => `${productName.toLowerCase()}_ui`;

export const GuardianDrawer = () => {
  // iframeRef and guardianOrigin live in the context so they can be reached from
  // outside this component (e.g. the MCP relay hooks below, and MCPRegistrar).
  const { isOpen, iframeRef, guardianOrigin, pendingPrompt, clearPendingPrompt } = useGuardianDrawer();
  const { config } = useShellConfig();

  const guardianSource = (config.guardianSource || sourceForProduct(config.productName));
  // iframe src carries the source suffix; the origin passed to the hooks does not.
  const iframeSrc = `${guardianOrigin}?source=${encodeURIComponent(guardianSource)}`;

  useDiscoveryEmitter(iframeRef, guardianOrigin);
  useMcpCallHandler(iframeRef, guardianOrigin);
  usePromptEmitter(iframeRef, guardianOrigin, pendingPrompt, clearPendingPrompt);

  const frameProps: GuardianFrameProps = {
    ref: iframeRef,
    src: iframeSrc,
    title: 'Guardian AI Assistant',
    allow: 'clipboard-write',
  };

  if (guardianSource === ARTESCA_GUARDIAN_SOURCE) {
    return <ArtescaGuardianDrawer isOpen={isOpen} frameProps={frameProps} guardianOrigin={guardianOrigin} />;
  }

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
      <iframe {...frameProps} style={{ width: DRAWER_WIDTH, height: '100%', border: 'none', background: '#000' }} />
    </div>
  );
};
