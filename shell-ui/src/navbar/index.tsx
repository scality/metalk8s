import React from 'react';
import { useShellConfig } from '../initFederation/ShellConfigProvider';
import { useShellThemeSelector } from '../initFederation/ShellThemeSelectorProvider';
import { Navbar } from './NavBar';
import { NavbarConfigProvider } from './NavbarConfigProvider';
import { NavbarUpdaterComponents } from './NavbarUpdaterComponents';
import { useFavicon } from './favicon';
import './library';
import { InstanceNameProvider } from './InstanceName';
export type SolutionsNavbarProps = {
  children?: React.ReactNode;
};

export const SolutionsNavbar = ({ children }: SolutionsNavbarProps) => {
  const { assets } = useShellThemeSelector();
  const { config } = useShellConfig();
  useFavicon(config?.favicon || '/brand/favicon-metalk8s.svg');
  return (
    <NavbarConfigProvider>
      <InstanceNameProvider>
        <>
          <Navbar logo={assets.logoPath} canChangeTheme={config.canChangeTheme}>
            {children}
          </Navbar>
          <NavbarUpdaterComponents />
        </>
      </InstanceNameProvider>
    </NavbarConfigProvider>
  );
};
