export class LocalStorageMock {
  store = {};
  clear = () => {
    this.store = {};
  };

  setItem = (key, val) => {
    this.store[key] = val;
  };
  getItem = key => this.store?.[key] ?? null;
  removeItem = key => {
    delete this.store[key];
  };
}

export const setupMock = () => {
  if (typeof global._localStorage !== 'undefined') {
    // Special case where `jsdom` sets localStorage and we can't overwrite it
    // See: https://github.com/jsdom/jsdom/commit/4d26c6773f011205d9c703cc5988e7c117efea31#diff-9b8fab691c00b9e5380b19ce882f3271R1
    // See: https://github.com/clarkbw/jest-localstorage-mock/pull/80
    Object.defineProperty(global, '_localStorage', {
      value: new LocalStorageMock(),
      writable: false,
    });
  } else {
    global.localStorage = new LocalStorageMock();
  }
};
