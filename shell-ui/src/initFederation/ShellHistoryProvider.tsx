import React, { createContext, useContext } from 'react';
import { useHistory } from 'react-router';
import * as H from 'history';

declare global {
  interface Window {
    shellContexts: {
      ShellHistoryContext: React.Context<null | H.History>;
    };
  }
}
const ShellHistoryContext = createContext<null | H.History>(null);
if (!window.shellContexts) {
  window.shellContexts = {
    ShellHistoryContext,
  };
}

if (!window.shellContexts.ShellHistoryContext) {
  window.shellContexts.ShellHistoryContext = ShellHistoryContext;
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
