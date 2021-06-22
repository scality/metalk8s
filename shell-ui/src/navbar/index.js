//@flow
import React, { useLayoutEffect, type Node, useMemo } from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import reactToWebComponent from 'react-to-webcomponent';
import { ThemeProvider as StyledComponentsProvider } from 'styled-components';
import { WebStorageStateStore } from 'oidc-client';
import { QueryClient, QueryClientProvider, useQuery } from 'react-query';
import { LoadingNavbar, Navbar } from './NavBar';
import { UserDataListener } from './UserDataListener';
import { logOut } from './auth/logout';
import { prefetch } from 'quicklink';
import { LanguageProvider } from './lang';
import { ThemeProvider } from './theme';
import { useFavicon } from './favicon';
import packageJson from '../../package.json';
const { version } = packageJson;
import './library';
import ErrorPage500 from '@scality/core-ui/dist/components/error-pages/ErrorPage500.component';
import {useConfig} from '../initFederation/ConfigurationProviders';
import { useShellConfig } from '../initFederation/ShellConfigProvider';

//TODO cleanup unnecessary types
export type PathDescription = {
  en: string,
  fr: string,
  groups?: string[],
  activeIfMatches?: string,
  icon?: string,
  module?: string,
  scope?: string,
  url?: string,
  isExternal?: boolean,
  order?: number,
};
export type MenuItems = { [path: string]: PathDescription };

export type Options = { main: MenuItems, subLogin: MenuItems };

export type UserGroupsMapping = { [email: string]: string[] };

export type Browser = {
  open: (link: {name: string, view: string}) => void;
}

export type SolutionsNavbarProps = {
  'oidc-provider-url'?: string,
  scopes?: string,
  'client-id'?: string,
  'response-type'?: string,
  'redirect-url'?: string,
  'config-url'?: string,
  options?: string,
  'logo-light'?: string,
  'logo-dark'?: string,
  favicon?: string,
  'can-change-theme'?: string,
  'can-change-language'?: string,
  onAuthenticated?: (evt: CustomEvent) => void,
  onLanguageChanged?: (evt: CustomEvent) => void,
  onThemeChanged?: (evt: CustomEvent) => void,
  logOut?: () => void,
  setUserManager?: (userManager: UserManager) => void,
  'provider-logout'?: string,
  children?: Node,
  federatedBrowser?: Browser,
};

type Config = {
  oidc?: {
    providerUrl?: string,
    redirectUrl?: string,
    clientId?: string,
    responseType?: string,
    scopes?: string,
  },
  logo?: {
    light?: string,
    dark?: string,
    darkRebrand?: string,
  },
  favicon?: string,
  options?: Options,
  canChangeTheme?: boolean,
  canChangeLanguage?: boolean,
  userGroupsMapping?: UserGroupsMapping,
};

export const SolutionsNavbar = ({
  'oidc-provider-url': oidcProviderUrl,
  scopes,
  'client-id': clientId,
  'redirect-url': redirectUrl,
  'config-url': configUrl,
  'response-type': responseType,
  'logo-dark': logoDark,
  'logo-light': logoLight,
  favicon,
  options,
  'can-change-theme': canChangeTheme,
  'can-change-language': canChangeLanguage,
  onAuthenticated,
  onLanguageChanged,
  onThemeChanged,
  logOut,
  setUserManager,
  'provider-logout': providerLogout,
  federatedBrowser,
  children,
}: SolutionsNavbarProps): Node => {

  const {config} = useShellConfig();

  useFavicon(favicon || config?.favicon || '/brand/favicon-metalk8s.svg');

  const logos = { dark: logoDark, darkRebrand: logoDark, light: logoLight };

      return (
          <LanguageProvider
            onLanguageChanged={onLanguageChanged}
            canChangeLanguage={
              canChangeLanguage !== undefined && canChangeLanguage !== null
                ? Boolean(canChangeLanguage)
                : config.canChangeLanguage
            }
          >
            <ThemeProvider onThemeChanged={onThemeChanged}>
              {(theme, themeName) => (
                <>
                  <StyledComponentsProvider theme={theme.brand}>
                    <Navbar
                      federatedBrowser={federatedBrowser}
                      logo={
                        logos[themeName] ||
                        config?.logo?.[themeName] ||
                        `/brand/assets/logo-${themeName}.svg`
                      }
                      canChangeLanguage={
                        canChangeLanguage !== undefined &&
                        canChangeLanguage !== null
                          ? Boolean(canChangeLanguage)
                          : config.canChangeLanguage
                      }
                      canChangeTheme={
                        canChangeTheme !== undefined && canChangeTheme !== null
                          ? Boolean(canChangeTheme)
                          : config.canChangeTheme
                      }
                      options={{main: {}, subLogin: {}}}
                      userGroupsMapping={config.userGroupsMapping}
                      providerLogout={
                        providerLogout
                          ? providerLogout === 'true'
                          : config?.providerLogout || false
                      }
                    >{children}</Navbar>
                  </StyledComponentsProvider>
                </>
              )}
            </ThemeProvider>
          </LanguageProvider>
      );
   
};

SolutionsNavbar.propTypes = {
  'oidc-provider-url': PropTypes.string,
  scopes: PropTypes.string,
  'client-id': PropTypes.string,
  'config-url': PropTypes.string,
  'redirect-url': PropTypes.string,
  'response-type': PropTypes.string,
  'logo-light': PropTypes.string,
  'logo-dark': PropTypes.string,
  'can-change-theme': PropTypes.string,
  'can-change-language': PropTypes.string,
  favicon: PropTypes.string,
  options: PropTypes.string,
  'provider-logout': PropTypes.string,
};

const SolutionsNavbarProviderWrapper = (props: SolutionsNavbarProps) => {
  const client = new QueryClient();
  return (
    <QueryClientProvider client={client}>
      <SolutionsNavbar {...props} />
    </QueryClientProvider>
  );
};
