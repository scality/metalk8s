import React from 'react';
import { useShellConfig } from '../initFederation/ShellConfigProvider';
import {
  useShellThemeAssets,
  useShellThemeSelector,
} from '../initFederation/ShellThemeSelectorProvider';
import { Navbar } from './NavBar';
import { NavbarConfigProvider } from './NavbarConfigProvider';
import { NavbarUpdaterComponents } from './NavbarUpdaterComponents';
import { useFavicon } from './favicon';
import './library';
export type SolutionsNavbarProps = {
  children?: React.ReactNode;
};

export const SolutionsNavbar = ({ children }: SolutionsNavbarProps) => {
  const { assets } = useShellThemeSelector();
  const { config } = useShellConfig();
  useFavicon(config?.favicon || '/brand/favicon-metalk8s.svg');
  return (
    <NavbarConfigProvider>
      <>
        <Navbar logo={assets.logoPath}>{children}</Navbar>
        <NavbarUpdaterComponents />
      </>
    </NavbarConfigProvider>
  );
};
