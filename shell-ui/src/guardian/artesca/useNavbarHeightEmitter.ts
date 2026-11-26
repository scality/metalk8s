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
    if (!iframe) return;

    let navbar: HTMLElement | null = null;

    const postNavbarHeight = () => {
      if (!navbar) return;
      iframe.contentWindow?.postMessage(
        { type: HOST_NAVBAR_HEIGHT_MESSAGE, height: navbar.getBoundingClientRect().height },
        origin,
      );
    };

    const resizeObserver = new ResizeObserver(postNavbarHeight);

    const locateNavbar = () => {
      const found = document.querySelector<HTMLElement>(NAVBAR_SELECTOR);
      if (found === navbar) return;
      navbar = found;
      resizeObserver.disconnect();
      if (!navbar) return;
      resizeObserver.observe(navbar);
      postNavbarHeight();
    };

    locateNavbar();
    iframe.addEventListener('load', postNavbarHeight);
    const mutationObserver = new MutationObserver(locateNavbar);
    mutationObserver.observe(document.body, { childList: true, subtree: true });
    return () => {
      iframe.removeEventListener('load', postNavbarHeight);
      mutationObserver.disconnect();
      resizeObserver.disconnect();
    };
  }, [iframeRef, origin]);
};
