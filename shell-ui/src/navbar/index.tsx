import React from 'react';
import { Navbar } from './NavBar';
import { useThemeName } from '../initFederation/ShellThemeSelectorProvider';
import { useFavicon } from './favicon';
import './library';
import { useShellConfig } from '../initFederation/ShellConfigProvider';
import { NavbarConfigProvider } from './NavbarConfigProvider';
import { NavbarUpdaterComponents } from './NavbarUpdaterComponents';
export type SolutionsNavbarProps = {
  children?: React.ReactNode;
};

export const SolutionsNavbar = ({ children }: SolutionsNavbarProps) => {
  const { themeName } = useThemeName();
  const { config } = useShellConfig();
  useFavicon(config?.favicon || '/brand/favicon-metalk8s.svg');
  return (
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
  );
};
