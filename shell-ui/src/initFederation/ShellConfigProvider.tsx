import { ErrorPage500 } from '@scality/core-ui/dist/components/error-pages/ErrorPage500.component';
import { Loader } from '@scality/core-ui/dist/components/loader/Loader.component';
import {
  CoreUITheme,
  CoreUIThemeName,
} from '@scality/core-ui/dist/style/theme';
import React, { createContext, useContext } from 'react';
import { useQuery } from 'react-query';

if (!window.shellContexts) {
  // @ts-expect-error - FIXME when you are working on it
  window.shellContexts = {};
}
// @ts-expect-error - FIXME when you are working on it
if (!window.shellContexts.ShellConfigContext) {
  // @ts-expect-error - FIXME when you are working on it
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

  canChangeTheme?: boolean;
  canChangeInstanceName?: boolean;
  // Not yet used and working
  canChangeLanguage?: boolean;
};

export type ShellConfig = {
  config: ShellJSONFileConfig;
  favicon: Pick<ShellJSONFileConfig, 'favicon'>;
  themes: Themes;
  status: 'idle' | 'loading' | 'success' | 'error';
};

export const useShellConfig = () => {
  const contextValue = useContext<ShellConfig>(
    // @ts-expect-error - FIXME when you are working on it
    window.shellContexts.ShellConfigContext,
  );

  if (!contextValue) {
    throw new Error("useShellConfig can't be used outside ShellConfigProvider");
  }

  if (contextValue.config) {
    contextValue.config.themes = {
      ...contextValue.config.themes,
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
    // @ts-expect-error - FIXME when you are working on it
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
      {/* @ts-expect-error - FIXME when you are working on it */}
    </window.shellContexts.ShellConfigContext.Provider>
  );
};
