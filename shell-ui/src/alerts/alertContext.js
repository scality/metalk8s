import { createContext } from 'react';

if (!window.shellContexts) {
  window.shellContexts = {};
}

if (!window.shellContexts.AlertContext) {
  window.shellContexts.AlertContext = createContext(null);
}
export const AlertContext = window.shellContexts.AlertContext;
