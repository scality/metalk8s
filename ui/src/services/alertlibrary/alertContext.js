import { createContext } from 'react';

if (!window.metalk8sContexts) {
  window.metalk8sContexts = {};
}

if (!window.metalk8sContexts.AlertContext) {
  window.metalk8sContexts.AlertContext = createContext(null);
}
export const AlertContext = window.metalk8sContexts.AlertContext;
