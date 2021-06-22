//@flow
import { type Node, createContext, useContext, useState } from 'react';
import type {
  OIDCConfig,
  OAuth2ProxyConfig,
} from '../initFederation/ConfigurationProviders';
const AuthConfigContext = createContext(null);

export const useAuthConfig = (): ({
  authConfig: OAuth2ProxyConfig | OIDCConfig | undefined,
  setAuthConfig: (authConfig: OAuth2ProxyConfig | OIDCConfig) => void,
}) => {
  const contextValue = useContext(AuthConfigContext);
  if (contextValue === null) {
    throw new Error("Can't use useAuthConfig outside AuthConfigProvider");
  }

  return contextValue;
};

export function AuthConfigProvider({children}: { children: Node }) {
  const [authConfig, setAuthConfig] = useState(undefined);

  return (
    <AuthConfigContext.Provider value={{ authConfig, setAuthConfig }}>
      {children}
    </AuthConfigContext.Provider>
  );
}
