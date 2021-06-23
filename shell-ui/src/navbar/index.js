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
import { useConfig } from '../initFederation/ConfigurationProviders';
import { useShellConfig } from '../initFederation/ShellConfigProvider';
export type SolutionsNavbarProps = {
  children?: Node,
};

export const SolutionsNavbar = ({ children }: SolutionsNavbarProps): Node => {
  const { config } = useShellConfig();

  useFavicon(config?.favicon || '/brand/favicon-metalk8s.svg');
  return (
    <LanguageProvider>
      <ThemeProvider>
        {(theme, themeName) => (
          <>
            <StyledComponentsProvider theme={theme.brand}>
              <Navbar
                logo={
                  config?.themes?.[themeName].logoPath ||
                  `/brand/assets/logo-${themeName}.svg`
                }
                userGroupsMapping={config.userGroupsMapping}
              >
                {children}
              </Navbar>
            </StyledComponentsProvider>
          </>
        )}
      </ThemeProvider>
    </LanguageProvider>
  );
};
