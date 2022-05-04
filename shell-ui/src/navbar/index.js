//@flow
import React, { type Node } from 'react';
import { CoreUiThemeProvider } from '@scality/core-ui/dist/components/coreuithemeprovider/CoreUiThemeProvider';

import { Navbar } from './NavBar';
import { LanguageProvider } from './lang';
import { ThemeProvider } from './theme';
import { useFavicon } from './favicon';
import './library';
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
            <CoreUiThemeProvider theme={theme.brand}>
              <Navbar
                logo={
                  config?.themes?.[themeName].logoPath ||
                  `/brand/assets/logo-${themeName}.svg`
                }
                userGroupsMapping={config.userGroupsMapping}
              >
                {children}
              </Navbar>
            </CoreUiThemeProvider>
          </>
        )}
      </ThemeProvider>
    </LanguageProvider>
  );
};
