//@flow
import { createContext, useContext, type Node } from 'react';
import { ErrorPage500, Loader } from '@scality/core-ui';
import { useQuery } from 'react-query';

if (!window.shellContexts) {
  window.shellContexts = {};
}

if (!window.shellContexts.ShellConfigContext) {
  window.shellContexts.ShellConfigContext = createContext(null);
}

export type Theme = {
  logoPath: string,
  faviconPath: string,
  colors: {
    statusHealthy: string,
    statusWarning: string,
    statusCritical: string,
    selectedActive: string,
    highlight: string,
    border: string,
    buttonPrimary: string,
    buttonSecondary: string,
    buttonDelete: string,
    infoPrimary: string,
    infoSecondary: string,
    backgroundLevel1: string,
    backgroundLevel2: string,
    backgroundLevel3: string,
    backgroundLevel4: string,
    textPrimary: string,
    textSecondary: string,
    textTertiary: string,
    textReverse: string,
    textLink: string,
  },
};

export type NavbarEntry = {
  groups?: string[],
  label?: {
    en: string,
    fr: string,
  },
  kind?: string,
  view?: string,
  url?: string,
  icon?: string,
  isExternal: boolean,
};

export type ShellConfig = {
  themes?: { [themeName: string]: Theme },
  navbar: {
    main: NavbarEntry[],
    subLogin: NavbarEntry[],
  },
  discoveryUrl: string,
  userGroupsMapping: { [email: string]: string[] },
};

export const useShellConfig = (): {
  config: ShellConfig,
  status: 'idle' | 'loading' | 'success' | 'error',
} => {
  const contextValue = useContext(window.shellContexts.ShellConfigContext);
  if (!contextValue) {
    throw new Error("useShellConfig can't be used outside ShellConfigProvider");
  }

  return contextValue;
};

export const ShellConfigProvider = ({ shellConfigUrl, children }): Node => {
  const { data: config, status } = useQuery<Config>(
    'navbarConfig',
    () => {
      return fetch(shellConfigUrl).then((r) => {
        if (r.ok) {
          return r.json();
        } else {
          return Promise.reject();
        }
      });
    },
    { refetchOnWindowFocus: false },
  );

  return (
    <window.shellContexts.ShellConfigContext.Provider
      value={{ config, status }}
    >
      {(status === 'idle' || status === 'loading') && (
        <Loader size="massive" centered={true} aria-label="loading" />
      )}
      {status === 'error' && <ErrorPage500 data-cy="sc-error-page500" />}
      {status === 'success' && children}
    </window.shellContexts.ShellConfigContext.Provider>
  );
};
