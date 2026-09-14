import { useShellConfig } from '../initFederation/ShellConfigProvider';
import { useGuardianDrawer } from './GuardianContext';
import { useDiscoveryEmitter, useMcpCallHandler } from './guardianPostMessageHooks';

const DRAWER_WIDTH = 500;

// Maps the shell product to the `source` value Guardian filters agents by:
// the lowercased product name with a `_ui` suffix (ARTESCA -> artesca_ui,
// RING -> ring_ui).
const sourceForProduct = (productName: string): string => `${productName.toLowerCase()}_ui`;

export const GuardianDrawer = () => {
  // iframeRef and guardianOrigin live in the context so they can be reached from
  // outside this component (e.g. the MCP relay hooks below, and MCPRegistrar).
  const { isOpen, iframeRef, guardianOrigin } = useGuardianDrawer();
  const { config } = useShellConfig();

  const guardianSource = (config.guardianSource || sourceForProduct(config.productName));
  // iframe src carries the source suffix; the origin passed to the hooks does not.
  const iframeSrc = `${guardianOrigin}?source=${encodeURIComponent(guardianSource)}`;

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
