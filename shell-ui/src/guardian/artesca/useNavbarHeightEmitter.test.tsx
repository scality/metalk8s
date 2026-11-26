import { renderHook, waitFor } from '@testing-library/react';
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

const createNavbar = (height: number) => {
  const navbar = document.createElement('div');
  navbar.className = 'sc-navbar';
  navbar.getBoundingClientRect = () => ({ height }) as DOMRect;
  return navbar;
};

it('posts the navbar height once the navbar is added after mount', async () => {
  const iframe = document.createElement('iframe');
  document.body.replaceChildren(iframe);
  const postMessage = jest.spyOn(iframe.contentWindow as Window, 'postMessage').mockImplementation(() => {});
  renderHook(() => useNavbarHeightEmitter({ current: iframe }, ORIGIN));
  expect(postMessage).not.toHaveBeenCalled();

  document.body.prepend(createNavbar(46));
  await waitFor(() =>
    expect(postMessage).toHaveBeenLastCalledWith({ type: HOST_NAVBAR_HEIGHT_MESSAGE, height: 46 }, ORIGIN),
  );
});

it('posts the new height when the navbar node is replaced', async () => {
  const { postMessage } = setup({ value: 45 });
  expect(postMessage).toHaveBeenLastCalledWith({ type: HOST_NAVBAR_HEIGHT_MESSAGE, height: 45 }, ORIGIN);

  document.querySelector('.sc-navbar')?.replaceWith(createNavbar(52));
  await waitFor(() =>
    expect(postMessage).toHaveBeenLastCalledWith({ type: HOST_NAVBAR_HEIGHT_MESSAGE, height: 52 }, ORIGIN),
  );
});
