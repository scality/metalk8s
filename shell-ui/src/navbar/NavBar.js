//@flow
import CoreUINavbar from '@scality/core-ui/dist/components/navbar/Navbar.component';
import Dropdown from '@scality/core-ui/dist/components/dropdown/Dropdown.component';
import { type Item as CoreUIDropdownItem } from '@scality/core-ui/src/lib/components/dropdown/Dropdown.component';
import { useEffect, useLayoutEffect, useState, useCallback } from 'react';
import styled from 'styled-components';
import type {
  Options,
  SolutionsNavbarProps,
  PathDescription,
  UserGroupsMapping,
  Browser,
} from './index';
import type { Node } from 'react';
import { logOut } from './auth/logout';
import {
  getAccessiblePathsFromOptions,
  getUserGroups,
  isEntryAccessibleByTheUser,
  normalizePath,
} from './auth/permissionUtils';
import { prefetch } from 'quicklink';
import { useTheme } from 'styled-components';
import { useLanguage } from './lang';
import { useThemeName } from './theme';
import { useIntl } from 'react-intl';
import { useAuth } from '../auth/AuthProvider';
import {
  useDiscoveredViews,
  useLinkOpener,
} from '../initFederation/ConfigurationProviders';
import { useLocation } from 'react-router-dom';
import { matchPath, RouteProps } from 'react-router';

const Logo = styled.img`
  height: 30px;
`;

export const LoadingNavbar = ({ logo }: { logo: string }): Node => (
  <CoreUINavbar
    logo={<Logo src={logo} alt="logo" />}
    role="navigation"
    tabs={[{ title: 'loading' }]}
  />
);

const NavbarDropDownItem = styled.div`
  display: flex;
  width: 200px;
  align-items: center;
`;

const NavbarDropDownItemIcon = styled.div`
  padding-right: 10px;
  color: ${(props) => props.theme.textSecondary};
`;

const NavbarDropDownItemLabel = styled.div`
  flex-grow: 1;
`;

const NavbarDropDownItemExternal = styled.div`
  padding-left: 10px;
  color: ${(props) => props.theme.secondary};
`;

const Item = ({
  icon,
  label,
  isExternal,
}: {
  icon?: string,
  label: string,
  isExternal?: boolean,
}) => {
  const brand = useTheme();
  return (
    <NavbarDropDownItem>
      {icon && (
        <NavbarDropDownItemIcon>
          <i className={icon} />
        </NavbarDropDownItemIcon>
      )}
      <NavbarDropDownItemLabel>{label}</NavbarDropDownItemLabel>
      {isExternal && (
        <NavbarDropDownItemExternal>
          <i className="fas fa-external-link-alt" />
        </NavbarDropDownItemExternal>
      )}
    </NavbarDropDownItem>
  );
};

const Link = ({
  children,
  to,
}: {
  children: Node,
  to:
    | { isExternal: boolean, app: SolutionUI, view: View, isFederated: true }
    | { isFederated: false, isExternal: boolean, url: string },
}) => {
  const { openLink } = useLinkOpener();
  return (
    <a href={'#'} onClick={() => openLink(to)}>
      {children}
    </a>
  );
};

export const Navbar = ({
  logo,
  canChangeLanguage,
  canChangeTheme,
  providerLogout,
  federatedBrowser,
  children,
}: {
  logo: string,
  canChangeLanguage?: boolean,
  canChangeTheme?: boolean,
  providerLogout: boolean,
  federatedBrowser?: Browser,
  children?: Node,
}): Node => {
  const { userData } = useAuth();
  const brand = useTheme();

  const { themeName, unSelectedThemes, setTheme } = useThemeName();
  const { language, setLanguage, unSelectedLanguages } = useLanguage();
  const intl = useIntl();

  const discoveredViews = useDiscoveredViews();
  const location = useLocation();
  const { openLink } = useLinkOpener();

  const doesRouteMatch = useCallback(
    (path: RouteProps) => {
      return matchPath(location.pathname, path);
    },
    [location],
  );

  const accessibleViews = discoveredViews.filter(
    (discoveredView) =>
      userData &&
      (discoveredView.groups?.some((group) =>
        userData.groups.includes(group),
      ) ??
        true),
  );

  const selectedTabs = accessibleViews.filter((accessibleView) =>
    accessibleView.isFederated
      ? doesRouteMatch({
          path:
            accessibleView.app.appHistoryBasePath + accessibleView.view.path,
          exact: accessibleView.view.exact,
          strict: accessibleView.view.strict,
          sensitive: accessibleView.view.sensitive,
        })
      : normalizePath(accessibleView.url) ===
        window.location.origin + window.location.pathname,
  );

  const selectedMainTabs = selectedTabs.filter(tab =>
    tab.navbarGroup === 'main',
  );
  const selectedMainTab = selectedMainTabs.pop();

  const selectedSubLoginTabs = selectedTabs.filter(tab => 
    tab.navbarGroup === 'subLogin',
  );
  const selectedSubLoginTab = selectedSubLoginTabs.pop();

  const tabs = accessibleViews
    .filter((accessibleView) => accessibleView.navbarGroup === 'main')
    .map((accessibleView) => ({
      link: (
        <Link to={accessibleView}>{accessibleView.view.label[language]}</Link>
      ),
      selected: selectedMainTab
        ? selectedMainTab.app.name === accessibleView.app.name &&
          selectedMainTab.view.path === accessibleView.view.path
        : false,
    }));

  const rightActions = [
    {
      type: 'dropdown',
      text: userData?.username || '',
      icon: (
        <span style={{ color: brand.textTertiary }}>
          <i className="fas fa-user-cog"></i>
        </span>
      ),
      items: [
        ...accessibleViews
          .filter((accessibleView) => accessibleView.navbarGroup === 'subLogin')
          .map((accessibleView) => ({
            label: (
              // $FlowFixMe Dropdown item typing is currently a string but can also accepts a react node
              <Item
                icon={accessibleView.icon}
                isExternal={accessibleView.isExternal}
                label={accessibleView.view.label[language]}
              />
            ),
            selected: selectedSubLoginTab
              ? selectedSubLoginTab.app.name === accessibleView.app.name &&
                selectedSubLoginTab.view.path === accessibleView.view.path
              : false,
            onClick: () => {
              openLink(accessibleView);
            },
          })),
        {
          label: (
            <Item
              icon={'fas fa-sign-out-alt'}
              label={intl.formatMessage({ id: 'sign-out' })}
            />
          ),
          onClick: () => {
            //logOut(auth.userManager, providerLogout); todo
          },
        },
      ],
    },
  ];

  if (canChangeLanguage) {
    rightActions.unshift({
      type: 'dropdown',
      text: language,
      items: unSelectedLanguages.map((lang) => ({
        label: lang,
        onClick: () => {
          setLanguage(lang);
        },
      })),
    });
  }

  if (canChangeTheme) {
    rightActions.unshift({
      type: 'dropdown',
      text: themeName,
      items: unSelectedThemes.map((theme) => ({
        label: theme,
        onClick: () => {
          setTheme(theme);
        },
      })),
    });
  }

  return (
    <>
      <CoreUINavbar
        logo={<Logo src={logo} alt="logo" />}
        rightActions={rightActions}
        tabs={tabs}
        role="navigation"
      />
      {children}
    </>
  );
};
