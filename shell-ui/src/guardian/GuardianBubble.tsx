import { useCallback, useRef, useState } from 'react';
import { BubbleButton } from './BubbleButton';
import { GUARDIAN_ORIGIN, useDiscoveryEmitter, useMcpCallHandler } from './guardianPostMessageHooks';
import { Overlay } from './Overlay';

export const GuardianBubble = () => {
  const [isOpen, setIsOpen] = useState(false);
  const toggleOpen = useCallback(() => setIsOpen((v) => !v), []);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useDiscoveryEmitter(iframeRef);
  useMcpCallHandler(iframeRef);

  return (
    <>
      <Overlay iframeRef={iframeRef} isOpen={isOpen} url={GUARDIAN_ORIGIN} />
      <BubbleButton isOpen={isOpen} onClick={toggleOpen} />
    </>
  );
};
