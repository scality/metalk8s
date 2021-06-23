//@flow
import { createContext, useContext, type Node } from 'react';
import ErrorPage500 from '@scality/core-ui/dist/components/error-pages/ErrorPage500.component';
import Loader from '@scality/core-ui/dist/components/loader/Loader.component';
import { useQuery } from 'react-query';

const ShellConfigContext = createContext(null);

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
  groups: string[],
  kind: string,
  view: string,
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
  const contextValue = useContext(ShellConfigContext);
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
    <ShellConfigContext.Provider value={{ config, status }}>
      {(status === 'idle' || status === 'loading') && (
        <Loader size="massive" centered={true} aria-label="loading" />
      )}
      {status === 'error' && <ErrorPage500 data-cy="sc-error-page500" />}
      {status === 'success' && children}
    </ShellConfigContext.Provider>
  );
};
