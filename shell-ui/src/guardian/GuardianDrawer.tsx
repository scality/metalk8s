import { useRef } from 'react';
import { useGuardianDrawer } from './GuardianContext';
import { GUARDIAN_ORIGIN, useDiscoveryEmitter, useMcpCallHandler } from './guardianPostMessageHooks';

const DRAWER_WIDTH = 500;

export const GuardianDrawer = () => {
  const { isOpen } = useGuardianDrawer();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useDiscoveryEmitter(iframeRef);
  useMcpCallHandler(iframeRef);

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
        src={GUARDIAN_ORIGIN}
        title="Guardian AI Assistant"
        style={{ width: DRAWER_WIDTH, height: '100%', border: 'none', background: '#000' }}
        allow="clipboard-write"
      />
    </div>
  );
};
