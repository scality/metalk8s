//@Flow

import { createContext, useContext, useState } from 'react';
import { useHistory } from 'react-router';

if (!window.shellContexts) {
  window.shellContexts = {};
}

if (!window.shellContexts.ShellHistoryContext) {
  window.shellContexts.ShellHistoryContext = createContext(null);
}

export const useShellHistory = () => {
  const contextValue = useContext(window.shellContexts.ShellHistoryContext);
  if (!contextValue) {
    throw new Error(
      "useShellHistory can't be used outside of ShellHistoryProvider",
    );
  }
  return contextValue;
};

export const ShellHistoryProvider = ({ children }) => {
  const history = useHistory();

  return (
    <window.shellContexts.ShellHistoryContext.Provider value={history}>
      {children}
    </window.shellContexts.ShellHistoryContext.Provider>
  );
};
