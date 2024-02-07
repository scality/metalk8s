import { createContext } from 'react';

if (!window.shellContexts) {
  // @ts-expect-error - FIXME when you are working on it
  window.shellContexts = {};
}

// @ts-expect-error - FIXME when you are working on it
if (!window.shellContexts.AlertContext) {
  // @ts-expect-error - FIXME when you are working on it
  window.shellContexts.AlertContext = createContext(null);
}

// @ts-expect-error - FIXME when you are working on it
export const AlertContext = window.shellContexts.AlertContext;
