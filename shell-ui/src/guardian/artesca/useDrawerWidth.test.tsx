import { act, renderHook } from '@testing-library/react';
import { DEFAULT_DRAWER_WIDTH, MIN_DRAWER_WIDTH, useDrawerWidth } from './useDrawerWidth';

const STORAGE_KEY = 'shell.guardianDrawer.width';

const setWindowWidth = (width: number) => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
};

const drawerEndingAt = (right: number) =>
  ({ current: { getBoundingClientRect: () => ({ right }) } }) as unknown as React.RefObject<HTMLElement>;

const pressKey = (key: string) => ({ key, preventDefault: () => {} }) as unknown as React.KeyboardEvent<HTMLElement>;

beforeEach(() => {
  window.localStorage.clear();
  setWindowWidth(1600);
});

it('opens at the default width', () => {
  const { result } = renderHook(() => useDrawerWidth(drawerEndingAt(1600)));
  expect(result.current.width).toBe(DEFAULT_DRAWER_WIDTH);
});

it('never takes more than 40% of the window, even with a wider width remembered', () => {
  window.localStorage.setItem(STORAGE_KEY, '1200');
  const { result } = renderHook(() => useDrawerWidth(drawerEndingAt(1600)));
  expect(result.current.width).toBe(640);
  expect(result.current.maxWidth).toBe(640);
});

it('narrows with the window and returns to the remembered width when it grows back', () => {
  window.localStorage.setItem(STORAGE_KEY, '600');
  const { result } = renderHook(() => useDrawerWidth(drawerEndingAt(1600)));

  act(() => {
    setWindowWidth(1000);
    window.dispatchEvent(new Event('resize'));
  });
  expect(result.current.width).toBe(400);

  act(() => {
    setWindowWidth(1600);
    window.dispatchEvent(new Event('resize'));
  });
  expect(result.current.width).toBe(600);
});

it('keeps to the window-share cap on a window too narrow for the floor', () => {
  setWindowWidth(600);
  const { result } = renderHook(() => useDrawerWidth(drawerEndingAt(600)));
  expect(result.current.width).toBe(240);
  expect(result.current.width).toBeLessThan(MIN_DRAWER_WIDTH);
});

it('follows the pointer from the drawer edge and remembers the width on release', () => {
  const { result } = renderHook(() => useDrawerWidth(drawerEndingAt(1600)));

  act(() => result.current.onHandlePointerDown({ preventDefault: () => {} } as React.PointerEvent<HTMLElement>));
  act(() => {
    window.dispatchEvent(Object.assign(new Event('pointermove'), { clientX: 1000 }));
  });
  expect(result.current.isDragging).toBe(true);
  expect(result.current.width).toBe(600);

  act(() => {
    window.dispatchEvent(new Event('pointerup'));
  });
  expect(result.current.isDragging).toBe(false);
  expect(window.localStorage.getItem(STORAGE_KEY)).toBe('600');
});

it('widens with the left arrow, narrows with the right one, and resets on demand', () => {
  const { result } = renderHook(() => useDrawerWidth(drawerEndingAt(1600)));

  act(() => result.current.onHandleKeyDown(pressKey('ArrowLeft')));
  expect(result.current.width).toBe(DEFAULT_DRAWER_WIDTH + 16);

  act(() => result.current.onHandleKeyDown(pressKey('ArrowRight')));
  act(() => result.current.onHandleKeyDown(pressKey('ArrowRight')));
  expect(result.current.width).toBe(DEFAULT_DRAWER_WIDTH - 16);

  act(() => result.current.resetWidth());
  expect(result.current.width).toBe(DEFAULT_DRAWER_WIDTH);
  expect(window.localStorage.getItem(STORAGE_KEY)).toBe(String(DEFAULT_DRAWER_WIDTH));
});
