import React from 'react';
import { useShellConfig } from '../initFederation/ShellConfigProvider';
import { useShellThemeSelector } from '../initFederation/ShellThemeSelectorProvider';
import { Navbar } from './NavBar';
import { NavbarConfigProvider } from './NavbarConfigProvider';
import { NavbarUpdaterComponents } from './NavbarUpdaterComponents';
import { useFavicon } from './favicon';
import './library';
import { InstanceNameProvider } from './InstanceName';
import { ModuleFederation } from '@module-federation/enhanced/runtime';
export type SolutionsNavbarProps = {
  children?: React.ReactNode;
  mf: ModuleFederation;
};

export const SolutionsNavbar = ({ children, mf }: SolutionsNavbarProps) => {
  const { assets } = useShellThemeSelector();
  const { config } = useShellConfig();
  useFavicon(config?.favicon || '/brand/favicon-metalk8s.svg');
  return (
    <NavbarConfigProvider>
      <InstanceNameProvider>
        <>
          <Navbar logo={assets.logoPath} canChangeTheme={config.canChangeTheme} mf={mf}>
            {children}
          </Navbar>
          <NavbarUpdaterComponents />
        </>
      </InstanceNameProvider>
    </NavbarConfigProvider>
  );
};
