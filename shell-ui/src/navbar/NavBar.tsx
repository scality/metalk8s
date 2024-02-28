import React, { useCallback, useEffect, useMemo } from 'react';
import { RouteProps, matchPath, useHistory } from 'react-router';
import { useLocation } from 'react-router-dom';
import styled, { createGlobalStyle } from 'styled-components';

import { Icon } from '@scality/core-ui/dist/components/icon/Icon.component';
import { Layout } from '@scality/core-ui/dist/components/layout/v2/index';
import { Navbar as CoreUINavbar } from '@scality/core-ui/dist/components/navbar/Navbar.component';

import { Button } from '@scality/core-ui/dist/components/buttonv2/Buttonv2.component';
import { useIntl } from 'react-intl';
import { useTheme } from 'styled-components';
import { UserData, useAuth, useLogOut } from '../auth/AuthProvider';
import {
  BuildtimeWebFinger,
  NonFederatedView,
  ViewDefinition,
  useConfigRetriever,
  useDiscoveredViews,
  useLinkOpener,
} from '../initFederation/ConfigurationProviders';
import { useShellConfig } from '../initFederation/ShellConfigProvider';
import { useShellThemeSelector } from '../initFederation/ShellThemeSelectorProvider';
import { InstanceName, useInstanceName } from './InstanceName';
import NotificationCenter from './NotificationCenter';
import { normalizePath } from './auth/permissionUtils';
import { useLanguage } from './lang';
import type { Link as TypeLink } from './navbarHooks';
import { useNavbar } from './navbarHooks';

const Logo = styled.img`
  height: 2.143rem;
`;
export const LoadingNavbar = ({ logo }: { logo: string }) => (
  <CoreUINavbar
    logo={<Logo src={logo} alt="logo" />}
    // @ts-expect-error - FIXME when you are working on it
    role="navigation"
    tabs={[
      {
        title: 'loading',
      },
    ]}
  />
);
const GlobalStyle = createGlobalStyle`
  body {
    background-color: ${(props) => props.theme.backgroundLevel1};
  }
`;
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
  color: ${(props) => props.theme.textLink};
`;

const Item = ({
  icon,
  label,
  isExternal,
}: {
  icon?: string;
  label: string;
  isExternal?: boolean;
}) => {
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
          <Icon name="External-link" />
        </NavbarDropDownItemExternal>
      )}
    </NavbarDropDownItem>
  );
};

const Link = ({
  children,
  to,
  ...props
}: {
  children: React.ReactNode;
  to:
    | {
        isExternal: boolean;
        // @ts-expect-error - FIXME when you are working on it
        app: SolutionUI;
        // @ts-expect-error - FIXME when you are working on it
        view: View;
        isFederated: true;
      }
    | {
        isFederated: false;
        isExternal: boolean;
        url: string;
      };
}) => {
  const { openLink } = useLinkOpener();
  return (
    <a href={'#'} onClick={() => openLink(to)} {...props}>
      {children}
    </a>
  );
};

function prefetch(url: string) {
  return new Promise((resolve, reject) => {
    const existingElement = [
      ...(document.head?.querySelectorAll('script') || []),
      // @ts-expect-error - FIXME when you are working on it
    ].find((scriptElement) => scriptElement.attributes.src?.value === url);

    if (existingElement) {
      // @ts-expect-error - FIXME when you are working on it
      resolve();
    }

    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head?.appendChild(script);
  });
}

export const useNavbarLinksToActions = (
  links: TypeLink[],
): {
  link: TypeLink;
  selected: boolean;
}[] => {
  const location = useLocation();
  const doesRouteMatch = useCallback(
    (path: RouteProps) => {
      return matchPath(location.pathname, path);
    },
    [location],
  );
  const selectedTab = [...links]
    //Sort the exact and strict routes first, to make sure to match the exact first.
    .sort((a, b) => {
      if (!a.view.isFederated || !b.view.isFederated) {
        return 0;
      }
      if (a.view.view.path === '/') {
        return -1;
      }
      if (a.view.view.exact && !b.view.view.exact) {
        return -1;
      }
      if (!a.view.view.exact && b.view.view.exact) {
        return 1;
      }
      if (a.view.view.strict && !b.view.view.strict) {
        return -1;
      }
      if (!a.view.view.strict && b.view.view.strict) {
        return 1;
      }
      return 0;
    })
    .find((link) =>
      link.view.isFederated
        ? doesRouteMatch({
            path: link.view.view.activeIfMatches
              ? new RegExp(
                  link.view.app.appHistoryBasePath +
                    link.view.view.activeIfMatches,
                  'i',
                ).toString()
              : link.view.app.appHistoryBasePath + link.view.view.path,
            exact: link.view.view.exact,
            strict: link.view.view.strict,
            sensitive: link.view.view.sensitive,
          })
        : normalizePath((link.view as NonFederatedView).url) ===
          window.location.origin + window.location.pathname,
    );
  //Preload non current route
  const { retrieveConfiguration } = useConfigRetriever();
  useEffect(() => {
    links.forEach((link) => {
      if (!link.view.isFederated) {
        return;
      }

      //Check if it is the current route
      if (
        !selectedTab ||
        (selectedTab?.view.isFederated &&
          link.view.app.name === selectedTab.view.app.name &&
          link.view.view.path === selectedTab.view.view.path)
      ) {
        return;
      }

      const microAppConfiguration:
        | BuildtimeWebFinger
        | { spec: { remoteEntryPath: string } } = retrieveConfiguration({
        configType: 'build',
        name: link.view.app.name,
      }) || {
        spec: {
          remoteEntryPath: '',
        },
      };
      const remoteEntryUrl = link.view.isFederated
        ? link.view.app.url +
          microAppConfiguration.spec.remoteEntryPath +
          '?version=' +
          link.view.app.version
        : '';

      prefetch(remoteEntryUrl).catch((e) =>
        console.error(`Failed to preload ${remoteEntryUrl}`, e),
      );
    });
  }, [JSON.stringify(links)]);

  return links.map((link) => {
    return {
      link,
      selected:
        selectedTab && selectedTab.view.isFederated && link.view.isFederated
          ? selectedTab.view.app.name === link.view.app.name &&
            selectedTab.view.view.path === link.view.view.path
          : selectedTab &&
            !selectedTab.view.isFederated &&
            !link.view.isFederated
          ? normalizePath((selectedTab.view as NonFederatedView).url) ===
            normalizePath((link.view as NonFederatedView).url)
          : false,
    };
  });
};
export const useFederatedNavbarEntries = (): {
  accessibleViews: ViewDefinition[];
} => {
  const { userData } = useAuth();
  const discoveredViews = useDiscoveredViews();
  const accessibleViews = discoveredViews.filter(
    (discoveredView) =>
      userData &&
      (discoveredView.groups?.some((group) =>
        userData.groups.includes(group),
      ) ??
        true),
  );
  return {
    accessibleViews,
  };
};

const SkipToContentLink = styled(Button)`
  left: 50%;
  width: max-content;
  position: absolute;
  transform: translateY(-100%);
  transition: transform 0.3s;
  &:focus {
    transform: translateY(0);
  }
`;

export const Navbar = ({
  logo,
  canChangeLanguage,
  canChangeTheme,
  children,
}: {
  logo: string;
  canChangeLanguage?: boolean;
  canChangeTheme?: boolean;
  providerLogout?: boolean;
  children?: React.ReactNode;
}) => {
  const theme = useTheme();
  const { userData } = useAuth();
  const { themeMode, setThemeMode } = useShellThemeSelector();
  const { language, setLanguage, unSelectedLanguages } = useLanguage();
  const intl = useIntl();
  const { openLink } = useLinkOpener();
  const { logOut } = useLogOut();
  const { getLinks } = useNavbar();
  const history = useHistory();
  const navbarLinks = useMemo(() => getLinks(), [getLinks]);
  const navbarMainActions = useNavbarLinksToActions(navbarLinks.main);
  const navbarSecondaryActions = useNavbarLinksToActions(navbarLinks.secondary);
  const navbarSubloginActions = useNavbarLinksToActions(
    navbarLinks.userDropdown,
  );
  const navbarEntrySelected =
    navbarMainActions.find((act) => act.selected) ||
    navbarSecondaryActions.find((act) => act.selected) ||
    navbarSubloginActions.find((act) => act.selected);
  const { config } = useShellConfig();
  const instanceName = useInstanceName();
  const title =
    config.productName +
    ' ' +
    (instanceName ? `- ${instanceName} - ` : '') +
    (navbarEntrySelected?.link.view.view.label.en || '');
  useEffect(() => {
    if (title) {
      document.title = title;
    }
  }, [title]);

  useEffect(() => {
    const navbarMainSelected = navbarMainActions.find((act) => act.selected);
    if (navbarMainActions.length && !navbarMainSelected) {
      const link = navbarMainActions?.[0]?.link;
      const url = link.view.isFederated
        ? link.view.app.appHistoryBasePath + link.view.view.path
        : (link.view as NonFederatedView).url;
      history.replace(url);
    }
  }, [navbarMainActions]);

  const mainTabs = navbarMainActions.map((action) => ({
    link: action.link.render ? (
      <action.link.render selected={action.selected} />
    ) : (
      // @ts-expect-error - FIXME when you are working on it
      <Link to={action.link.view}>{action.link.view.view.label[language]}</Link>
    ),
    selected: action.selected,
  }));

  const secondaryTabs = navbarSecondaryActions.map((action) => ({
    type: 'custom' as const,
    render: () =>
      action.link.render ? (
        <action.link.render selected={action.selected} />
      ) : (
        // @ts-expect-error - FIXME when you are working on it
        <Link to={action.link.view}>
          {action.link.view.view.label[language]}
        </Link>
      ),
  }));

  const PLATFORM_ADMIN_ROLE = 'PlatformAdmin';
  const isPlatformAdmin = (userData?: UserData): boolean => {
    if (userData) {
      if (userData.groups.includes(PLATFORM_ADMIN_ROLE)) {
        return true;
      }
    }
    return false;
  };

  const notificationTab = {
    type: 'custom',
    icon: <></>,
    render: () => <NotificationCenter />,
  };

  type RightTabItem =
    | {
        type: 'dropdown';
        text: string;
        icon?: React.ReactNode;
        items: {
          label: React.ReactNode;
          selected?: boolean;
          onClick: () => void;
        }[];
      }
    | {
        type: 'custom';
        render: () => React.ReactNode;
      };

  const rightTabs: RightTabItem[] = [
    ...secondaryTabs,
    {
      type: 'dropdown',
      text: userData?.username || '',
      icon: <Icon name="User" color={theme.textPrimary} />,
      items: [
        ...navbarSubloginActions.map((action) => ({
          label: action.link.render ? (
            <action.link.render selected={action.selected} />
          ) : (
            <Item
              icon={action.link.view.icon}
              isExternal={
                // @ts-expect-error - FIXME when you are working on it
                !action.link.view.isFederated && action.link.view.isExternal
              }
              label={action.link.view.view.label[language]}
            />
          ),
          selected: action.selected,
          onClick: () => {
            // @ts-expect-error - FIXME when you are working on it
            openLink(action.link.view);
          },
        })),
        {
          label: (
            <Item
              icon={'fas fa-sign-out-alt'}
              label={intl.formatMessage({
                id: 'sign-out',
              })}
            />
          ),
          onClick: () => {
            logOut();
          },
        },
      ],
    },
  ];

  if (isPlatformAdmin(userData)) {
    // @ts-expect-error - FIXME when you are working on it
    rightTabs.splice(secondaryTabs.length - 1, 0, notificationTab);
  }
  if (canChangeLanguage) {
    rightTabs.unshift({
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
    rightTabs.unshift({
      icon: <i className={`fas fa-${themeMode === 'dark' ? 'sun' : 'moon'}`} />,
      onClick: () => {
        setThemeMode(themeMode === 'dark' ? 'light' : 'dark');
      },
      // @ts-expect-error - FIXME when you are working on it
      type: 'button',
    });
  }

  return (
    <>
      <GlobalStyle />

      <SkipToContentLink
        type="submit"
        label="Skip to content"
        variant="primary"
        onClick={() => {
          const link = document.createElement('a');
          link.href = '#main';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }}
      />

      <Layout
        headerNavigation={
          <>
            <CoreUINavbar
              logo={
                <a href="/" aria-label="Visit the landing page">
                  <Logo src={logo} alt={config.productName + ' logo'} />
                </a>
              }
              // @ts-expect-error - FIXME when you are working on it
              rightActions={rightTabs}
              tabs={[
                {
                  render: <InstanceName />,
                },
                ...mainTabs,
              ]}
              role="navigation"
            />
            <div id="main"></div>
          </>
        }
      >
        {/* @ts-expect-error - FIXME when you are working on it */}
        {children}
      </Layout>
    </>
  );
};
