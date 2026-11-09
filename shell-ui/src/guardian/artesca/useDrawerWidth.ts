import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';

export const DEFAULT_DRAWER_WIDTH = 500;
export const MIN_DRAWER_WIDTH = 360;
/** Share of the window the drawer may take at most. */
export const MAX_DRAWER_WINDOW_SHARE = 0.4;
const KEYBOARD_STEP = 16;

const STORAGE_KEY = 'shell.guardianDrawer.width';

const readStoredWidth = (): number => {
  try {
    const stored = Number.parseFloat(window.localStorage.getItem(STORAGE_KEY) ?? '');
    return Number.isFinite(stored) ? stored : DEFAULT_DRAWER_WIDTH;
  } catch {
    return DEFAULT_DRAWER_WIDTH;
  }
};

const persistWidth = (width: number) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(width));
  } catch {
    // Not remembering the width is not worth failing a drag over.
  }
};

const useMaxDrawerWidth = (): number => {
  const [windowWidth, setWindowWidth] = useState(() => window.innerWidth);
  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return Math.floor(windowWidth * MAX_DRAWER_WINDOW_SHARE);
};

export type DrawerWidth = {
  width: number;
  maxWidth: number;
  /** The caller drops the width transition and the iframe's pointer events while true. */
  isDragging: boolean;
  onHandlePointerDown: (event: React.PointerEvent<HTMLElement>) => void;
  onHandleKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void;
  resetWidth: () => void;
};

/**
 * The drawer's width, dragged from its left edge and remembered across sessions. The cap follows
 * the window, so a narrower window narrows the drawer without forgetting the preferred width.
 */
export const useDrawerWidth = (drawerRef: RefObject<HTMLElement | null>): DrawerWidth => {
  const maxWidth = useMaxDrawerWidth();
  const [preferredWidth, setPreferredWidth] = useState(readStoredWidth);
  const [isDragging, setIsDragging] = useState(false);
  const latestWidth = useRef(preferredWidth);

  // Ordered so a window too narrow for the floor still honours the window-share cap.
  const clampWidth = useCallback((value: number) => Math.min(Math.max(value, MIN_DRAWER_WIDTH), maxWidth), [maxWidth]);

  const commitWidth = useCallback((value: number) => {
    latestWidth.current = value;
    setPreferredWidth(value);
  }, []);

  const applyFromClientX = useCallback(
    (clientX: number) => {
      const drawer = drawerRef.current;
      if (!drawer) return;
      commitWidth(clampWidth(drawer.getBoundingClientRect().right - clientX));
    },
    [drawerRef, clampWidth, commitWidth],
  );

  const onHandlePointerDown = useCallback((event: React.PointerEvent<HTMLElement>) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  // On the window, not the handle: the pointer outruns a 9px strip mid-drag.
  useEffect(() => {
    if (!isDragging) return;
    const onMove = (event: PointerEvent) => applyFromClientX(event.clientX);
    const onUp = () => {
      setIsDragging(false);
      persistWidth(latestWidth.current);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [isDragging, applyFromClientX]);

  const onHandleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      const step = event.key === 'ArrowLeft' ? KEYBOARD_STEP : event.key === 'ArrowRight' ? -KEYBOARD_STEP : 0;
      if (step === 0) return;
      event.preventDefault();
      const next = clampWidth(clampWidth(latestWidth.current) + step);
      commitWidth(next);
      persistWidth(next);
    },
    [clampWidth, commitWidth],
  );

  const resetWidth = useCallback(() => {
    commitWidth(DEFAULT_DRAWER_WIDTH);
    persistWidth(DEFAULT_DRAWER_WIDTH);
  }, [commitWidth]);

  return { width: clampWidth(preferredWidth), maxWidth, isDragging, onHandlePointerDown, onHandleKeyDown, resetWidth };
};
