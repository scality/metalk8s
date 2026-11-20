import { renderHook } from '@testing-library/react';
import { HOST_NAVBAR_HEIGHT_MESSAGE, useNavbarHeightEmitter } from './useNavbarHeightEmitter';

const ORIGIN = 'https://assistant.example';

let resizeCallback: () => void = () => {};
beforeAll(() => {
  global.ResizeObserver = class {
    constructor(callback: () => void) {
      resizeCallback = callback;
    }
    observe() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

const setup = (navbarHeight: { value: number }) => {
  const navbar = document.createElement('div');
  navbar.className = 'sc-navbar';
  navbar.getBoundingClientRect = () => ({ height: navbarHeight.value }) as DOMRect;
  const iframe = document.createElement('iframe');
  document.body.replaceChildren(navbar, iframe);
  const frameWindow = iframe.contentWindow as Window;
  const postMessage = jest.spyOn(frameWindow, 'postMessage').mockImplementation(() => {});
  renderHook(() => useNavbarHeightEmitter({ current: iframe }, ORIGIN));
  return { iframe, postMessage };
};

it('posts the navbar height to Guardian on mount, on every iframe load and on every resize', () => {
  const navbarHeight = { value: 45.88 };
  const { iframe, postMessage } = setup(navbarHeight);
  expect(postMessage).toHaveBeenLastCalledWith({ type: HOST_NAVBAR_HEIGHT_MESSAGE, height: 45.88 }, ORIGIN);

  navbarHeight.value = 48;
  iframe.dispatchEvent(new Event('load'));
  expect(postMessage).toHaveBeenLastCalledWith({ type: HOST_NAVBAR_HEIGHT_MESSAGE, height: 48 }, ORIGIN);

  navbarHeight.value = 50;
  resizeCallback();
  expect(postMessage).toHaveBeenLastCalledWith({ type: HOST_NAVBAR_HEIGHT_MESSAGE, height: 50 }, ORIGIN);
});
