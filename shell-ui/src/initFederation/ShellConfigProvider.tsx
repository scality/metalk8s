import { ErrorPage500 } from '@scality/core-ui/dist/components/error-pages/ErrorPage500.component';
import { Loader } from '@scality/core-ui/dist/components/loader/Loader.component';
import {
  CoreUITheme,
  CoreUIThemeName,
} from '@scality/core-ui/dist/style/theme';
import React, { createContext, useContext } from 'react';
import { useQuery } from 'react-query';

if (!window.shellContexts) {
  window.shellContexts = {};
}

if (!window.shellContexts.ShellConfigContext) {
  window.shellContexts.ShellConfigContext = createContext(null);
}

export type NavbarEntry = {
  groups?: string[];
  label?: {
    en: string;
    fr: string;
  };
  kind?: string;
  view?: string;
  url?: string;
  icon?: string;
  isExternal: boolean;
};

export type UserGroupsMapping = Record<string, string[]>;

// Will be removed when zenko-ui -> module federation
export type Options = {
  main: {
    [key: string]: Entry;
  };
  subLogin: {
    [key: string]: Entry;
  };
};

export type Entry = {
  en: string;
  fr: string;
  icon?: string;
  groups?: string[];
  isExternal?: boolean;
  order?: number;
  activeIfMatches?: string;
};

const example: Themes = {
  dark: {
    type: 'core-ui',
    name: 'darkRebrand',
    logoPath: '/brand/assets/logo-dark.svg',
  },
  light: {
    type: 'core-ui',
    name: 'artescaLight',
    logoPath: '/brand/assets/logo-light.svg',
  },
};

type CoreUIShellThemeDescription = {
  type: 'core-ui';
  name: CoreUIThemeName;
  logoPath: string;
};
type CustomShellThemeDescription = {
  type: 'custom';
  logoPath: string;
  colors: CoreUITheme;
};

type ThemeDescription =
  | CoreUIShellThemeDescription
  | CustomShellThemeDescription;

type Themes = {
  dark: ThemeDescription;
  light: ThemeDescription;
};
export type ShellJSONFileConfig = {
  discoveryUrl: string;
  navbar: {
    main: NavbarEntry[];
    subLogin: NavbarEntry[];
  };
  productName: string;
  themes: Themes;
  favicon?: string;

  // for IDP that does not support user groups (ie: Dex)
  userGroupsMapping?: UserGroupsMapping;
  // Legacy, will be removed when zenko-ui -> module federation
  options?: Options;
  // Not yet used and working
  canChangeLanguage?: boolean;
  canChangeTheme?: boolean;
};

export type ShellConfig = {
  config: ShellJSONFileConfig;
  favicon: Pick<ShellJSONFileConfig, 'favicon'>;
  themes: Themes;
  status: 'idle' | 'loading' | 'success' | 'error';
};

export const useShellConfig = () => {
  const contextValue = useContext<ShellConfig>(
    window.shellContexts.ShellConfigContext,
  );

  if (!contextValue) {
    throw new Error("useShellConfig can't be used outside ShellConfigProvider");
  }

  if (contextValue.config) {
    contextValue.config.themes = {
      ...contextValue.config.themes,
      ...example,
    };
  }

  return contextValue;
};

export const ShellConfigProvider = ({ shellConfigUrl, children }) => {
  const { data: config, status } = useQuery<ShellJSONFileConfig>(
    'getShellJSONConfigFile',
    () => {
      return fetch(shellConfigUrl).then((r) => {
        if (r.ok) {
          return r.json();
        } else {
          return Promise.reject();
        }
      });
    },
    {
      refetchOnWindowFocus: false,
    },
  );

  return (
    <window.shellContexts.ShellConfigContext.Provider
      value={{
        config,
        status,
      }}
    >
      {(status === 'idle' || status === 'loading') && (
        <Loader size="massive" centered={true} aria-label="loading" />
      )}
      {status === 'error' && <ErrorPage500 data-cy="sc-error-page500" />}
      {status === 'success' && children}
    </window.shellContexts.ShellConfigContext.Provider>
  );
};
