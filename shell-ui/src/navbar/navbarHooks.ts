import type { Node } from 'react';
import { createContext, useContext, useEffect } from 'react';
import { useFederatedNavbarEntries } from './NavBar';
import type { ViewDefinition } from '../initFederation/ConfigurationProviders';
import '../initFederation/ConfigurationProviders';
import { NavbarContext } from './navbarContext';
export type Link = {
  render?: (props: { selected?: boolean }) => Node;
  view: ViewDefinition;
};
export type NavbarLinks = {
  main: Link[];
  secondary: Link[];
  userDropdown: Link[];
  logoHref: string;
};
export type Navbar = {
  setLogoLink(href: string): void;
  setMainLinks(links: Link[]): void;
  setSecondaryLinks(links: Link[]): void;
  setUserDropdownLinks(links: Link[]): void;
  getLinks(): NavbarLinks;
};
export const useNavbar = (): Navbar => {
  const navbar = useContext(NavbarContext);

  if (!navbar) {
    throw new Error("Can't use useNavbar outside of NavbarConfigProvider");
  }

  return navbar;
};