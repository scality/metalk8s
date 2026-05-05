import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useFederatedNavbarEntries } from './NavBar';
import type { Link, Navbar, NavbarLinks } from './navbarHooks';
import './navbarHooks';
import { NavbarContext } from './navbarContext';

export const NavbarConfigProvider = ({ children }: { children: ReactNode }): JSX.Element => {
  const { accessibleViews } = useFederatedNavbarEntries();
  const [logoLink, setLogoLink] = useState<string>('');
  const [mainLinks, setMainLinks] = useState<Link[]>([]);
  const [secondaryLinks, setSecondaryLinks] = useState<Link[]>([]);
  const [userDropdownLinks, setUserDropdownLinks] = useState<Link[]>([]);

  useEffect(() => {
    setMainLinks(
      accessibleViews
        .filter((view) => view.navbarGroup === 'main')
        .map((view) => ({
          view,
        })),
    );
    setUserDropdownLinks(
      accessibleViews
        .filter((view) => view.navbarGroup === 'subLogin')
        .map((view) => ({
          view,
        })),
    );
  }, [JSON.stringify(accessibleViews)]);

  const navbarLinks: NavbarLinks = {
    logoHref: logoLink,
    main: mainLinks,
    secondary: secondaryLinks,
    userDropdown: userDropdownLinks,
  };

  const navbar: Navbar = {
    setLogoLink,
    setMainLinks,
    setSecondaryLinks,
    setUserDropdownLinks,
    getLinks: () => navbarLinks,
  };

  return <NavbarContext.Provider value={navbar}>{children}</NavbarContext.Provider>;
};
