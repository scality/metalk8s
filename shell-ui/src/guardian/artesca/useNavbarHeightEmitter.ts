import { type RefObject, useEffect } from 'react';

export const HOST_NAVBAR_HEIGHT_MESSAGE = 'HOST_NAVBAR_HEIGHT';

// core-ui's Navbar componentId, stable across builds unlike the generated class.
const NAVBAR_SELECTOR = '.sc-navbar';

/**
 * Tells Guardian the console navbar's height, on every load of the iframe and every change of the
 * navbar. Guardian's rem cannot match it: the console's root font size follows the window's width,
 * Guardian's the iframe's.
 */
export const useNavbarHeightEmitter = (iframeRef: RefObject<HTMLIFrameElement | null>, origin: string) => {
  useEffect(() => {
    const iframe = iframeRef.current;
    const navbar = document.querySelector<HTMLElement>(NAVBAR_SELECTOR);
    if (!iframe || !navbar) return;

    const postNavbarHeight = () =>
      iframe.contentWindow?.postMessage(
        { type: HOST_NAVBAR_HEIGHT_MESSAGE, height: navbar.getBoundingClientRect().height },
        origin,
      );

    postNavbarHeight();
    iframe.addEventListener('load', postNavbarHeight);
    const observer = new ResizeObserver(postNavbarHeight);
    observer.observe(navbar);
    return () => {
      iframe.removeEventListener('load', postNavbarHeight);
      observer.disconnect();
    };
  }, [iframeRef, origin]);
};
