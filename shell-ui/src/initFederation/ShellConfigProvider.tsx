import React from 'react';
import { createContext, useContext } from 'react';
import { Loader } from '@scality/core-ui/dist/components/loader/Loader.component';
import { ErrorPage500 } from '@scality/core-ui/dist/components/error-pages/ErrorPage500.component';
import { useQuery } from 'react-query';
import { useThemeName } from './ShellThemeSelectorProvider';

if (!window.shellContexts) {
  window.shellContexts = {};
}

if (!window.shellContexts.ShellConfigContext) {
  window.shellContexts.ShellConfigContext = createContext(null);
}

export type Theme = {
  logoPath: string;
  faviconPath: string;
  colors: {
    statusHealthy: string;
    statusWarning: string;
    statusCritical: string;
    selectedActive: string;
    highlight: string;
    border: string;
    buttonPrimary: string;
    buttonSecondary: string;
    buttonDelete: string;
    infoPrimary: string;
    infoSecondary: string;
    backgroundLevel1: string;
    backgroundLevel2: string;
    backgroundLevel3: string;
    backgroundLevel4: string;
    textPrimary: string;
    textSecondary: string;
    textTertiary: string;
    textReverse: string;
    textLink: string;
  };
};
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

const example = {
  navbar: {
    main: [
      {
        kind: 'metalk8s-ui',
        view: 'platform',
      },
      {
        kind: 'metalk8s-ui',
        view: 'alerts',
      },
    ],
    subLogin: [],
  },
  discoveryUrl: '/shell/deployed-ui-apps.json',
  productName: 'MetalK8s',
  theme: {
    dark: {
      type: 'core-ui',
      name: 'ring9dark',
      logo: '/shell/assets/logo-metalk8s.svg',
    },
    light: {
      type: 'core-ui',
      name: 'ring9light',
      logo: '/shell/assets/logo-metalk8s.svg',
    },

    dark2: {
      type: 'custom',
      name: 'ring9dark',
      logo: '/shell/assets/logo-metalk8s.svg',
      colors: {},
    },
  },
};

// custom: {
//   name: 'ring9custom',
//   logo: '/shell/assets/logo-metalk8s.svg',
//   colors: {
//     primary: '#00b39f',
//     secondary: '#00b39f',
//     accent: '#00b39f',
//     error: '#f44336',
//     info: '#2196f3',
//     success: '#4caf50',
//     warning: '#ff9800',
//   },
// },

// config fetched from /shell/config.json
export type ShellJSONFileConfig = {
  discoveryUrl: string;
  navbar: {
    main: NavbarEntry[];
    subLogin: NavbarEntry[];
  };
  productName: string;

  // optional (in dev mode)
  // TODO : Themes and Logo seems duplicated, check why
  themes?: {
    dark?: { logoPath: string };
    darkRebrand?: { logoPath: string };
    light?: { logoPath: string };
  };
  logo?: {
    dark?: string;
    darkRebrand?: string;
    light?: string;
  };
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
  themes: Pick<ShellJSONFileConfig, 'themes'>;
  status: 'idle' | 'loading' | 'success' | 'error';
};

export const useShellConfig = () => {
  const contextValue = useContext<ShellConfig>(
    window.shellContexts.ShellConfigContext,
  );

  if (!contextValue) {
    throw new Error("useShellConfig can't be used outside ShellConfigProvider");
  }

  const { themeName } = useThemeName();

  return {
    ...contextValue,
    favicon: contextValue.config.favicon || '/brand/favicon-metalk8s.svg',
    themes:
      {
        ...(contextValue.config.themes || {}),
        [themeName]: {
          ...(contextValue.config.themes || {})?.[themeName],
          logoPath:
            (contextValue.config.themes || {})?.[themeName]?.logoPath ||
            `/brand/assets/logo-${themeName}.svg`,
        },
      } || {},
  };
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
