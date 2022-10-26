// AutoSizer uses offsetWidth and offsetHeight.
// Jest runs in JSDom which doesn't support measurements APIs.
export function mockOffsetSize(width: number, height: number) {
  const originalFunction = window.getComputedStyle;
  const spyGetComputedStyle = jest.spyOn(window, 'getComputedStyle');
  spyGetComputedStyle.mockImplementation((elt, _) => {
    const originalStyle = originalFunction(elt);
    originalStyle.fontSize = '14px';
    return originalStyle;
  });
  Object.defineProperties(window.HTMLElement.prototype, {
    offsetHeight: {
      get: () => {
        return height || 100;
      },
    },
    offsetWidth: {
      get: () => {
        return width || 100;
      },
    },
  });
}