//@flow
import React, { type Node } from 'react';
import { CoreUiThemeProvider } from '@scality/core-ui/dist/components/coreuithemeprovider/CoreUiThemeProvider';

import { Navbar } from './NavBar';
import { LanguageProvider } from './lang';
import { ThemeProvider } from './theme';
import { useFavicon } from './favicon';
import './library';
import { useShellConfig } from '../initFederation/ShellConfigProvider';
import { NavbarConfigProvider } from './NavbarConfigProvider';
import { NavbarUpdaterComponents } from './NavbarUpdaterComponents';

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
              <NavbarConfigProvider>
                <>
                  <Navbar
                    logo={
                      config?.themes?.[themeName].logoPath ||
                      `/brand/assets/logo-${themeName}.svg`
                    }
                  >
                    {children}
                  </Navbar>
                  <NavbarUpdaterComponents />
                </>
              </NavbarConfigProvider>
            </CoreUiThemeProvider>
          </>
        )}
      </ThemeProvider>
    </LanguageProvider>
  );
};
