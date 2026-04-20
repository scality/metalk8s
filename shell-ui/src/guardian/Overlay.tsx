import type { RefObject } from 'react';

export const Overlay = ({
  iframeRef,
  isOpen,
  url,
}: {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  isOpen: boolean;
  url: string;
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
      src={url}
      title="Guardian AI Assistant"
      style={{ width: '100%', height: '100%', border: 'none', background: '#000' }}
      allow="clipboard-write"
    />
  </div>
);
