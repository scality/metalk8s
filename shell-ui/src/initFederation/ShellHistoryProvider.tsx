import { createContext, useContext } from 'react';
import { useNavigate } from 'react-router';

const ShellHistoryContext = createContext<ReturnType<typeof useNavigate> | null>(null);

export const useShellHistory = () => {
  const contextValue = useContext(ShellHistoryContext);

  if (!contextValue) {
    throw new Error("useShellHistory can't be used outside of ShellHistoryProvider");
  }

  return contextValue;
};
export const ShellHistoryProvider = ({ children }) => {
  const history = useNavigate();
  return <ShellHistoryContext.Provider value={history}>{children}</ShellHistoryContext.Provider>;
};
