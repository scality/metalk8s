import { Navbar as CoreUINavbar } from '@scality/core-ui/dist/components/navbar/Navbar.component';
import { Icon } from '@scality/core-ui/dist/components/icon/Icon.component';
import { useEffect, useCallback, useMemo } from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import type { Node } from 'react';
import { Layout2 } from '@scality/core-ui';
import { normalizePath } from './auth/permissionUtils';
import { useTheme } from 'styled-components';
import { useLanguage } from './lang';
import { useThemeName } from './theme';
import { useIntl } from 'react-intl';
import { useAuth, useLogOut } from '../auth/AuthProvider';
import type {
  ViewDefinition,
  FederatedView,
  BuildtimeWebFinger,
} from '../initFederation/ConfigurationProviders';
import '../initFederation/ConfigurationProviders';
import {
  useConfigRetriever,
  useDiscoveredViews,
  useLinkOpener,
} from '../initFederation/ConfigurationProviders';
import { useLocation } from 'react-router-dom';
import { matchPath, RouteProps } from 'react-router';
import type { Link as TypeLink } from './navbarHooks';
import { useNavbar } from './navbarHooks';
const Logo = styled.img`
  height: 2.143rem;
`;
export const LoadingNavbar = ({ logo }: { logo: string }): Node => (
  <CoreUINavbar
    logo={<Logo src={logo} alt="logo" />}
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
  color: ${(props) => props.theme.selectedActive};
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
  children: Node;
  to:
    | {
        isExternal: boolean;
        app: SolutionUI;
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
    //$FlowFixMe
    <a href={'#'} onClick={() => openLink(to)} {...props}>
      {children}
    </a>
  );
};

function prefetch(url: string) {
  return new Promise((resolve, reject) => {
    const existingElement = [
      ...(document.head?.querySelectorAll('script') || []),
    ].find((scriptElement) => scriptElement.attributes.src?.value === url);

    if (existingElement) {
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
  const selectedTab = links.find((link) =>
    link.view.isFederated
      ? doesRouteMatch({
          path: link.view.app.appHistoryBasePath + link.view.view.path,
          exact: link.view.view.exact,
          strict: link.view.view.strict,
          sensitive: link.view.view.sensitive,
        })
      : normalizePath(link.view.url) ===
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
        selectedTab?.view.isFederated &&
        link.view.app.name === selectedTab.view.app.name &&
        link.view.view.path === selectedTab.view.view.path
      ) {
        return;
      }

      const microAppConfiguration: BuildtimeWebFinger = retrieveConfiguration({
        configType: 'build',
        name: link.view.app.name,
      }) || {
        spec: {
          remoteEntryPath: '',
        },
      };
      const remoteEntryUrl = link.view.isFederated
        ? link.view.app.url + microAppConfiguration.spec.remoteEntryPath
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
          ? selectedTab.view.url === link.view.url
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
  children?: Node;
}): Node => {
  const brand = useTheme();
  const { userData } = useAuth();
  const { themeName, unSelectedThemes, setTheme } = useThemeName();
  const { language, setLanguage, unSelectedLanguages } = useLanguage();
  const intl = useIntl();
  const location = useLocation();
  const { openLink } = useLinkOpener();
  const { logOut } = useLogOut();
  const { getLinks } = useNavbar();
  const navbarLinks = useMemo(() => getLinks(), [getLinks]);
  const navbarMainActions = useNavbarLinksToActions(navbarLinks.main);
  const navbarSecondaryActions = useNavbarLinksToActions(navbarLinks.secondary);
  const navbarSubloginActions = useNavbarLinksToActions(
    navbarLinks.userDropdown,
  );
  const mainTabs = navbarMainActions.map((action) => ({
    link: action.link.render ? (
      <action.link.render selected={action.selected} />
    ) : (
      <Link to={action.link.view}>{action.link.view.view.label[language]}</Link>
    ),
    selected: action.selected,
  }));
  const secondaryTabs = navbarSecondaryActions.map((action) => ({
    type: 'custom',
    render: () =>
      action.link.render ? (
        <action.link.render selected={action.selected} />
      ) : (
        <Link to={action.link.view}>
          {action.link.view.view.label[language]}
        </Link>
      ),
  }));
  const rightTabs = [
    ...secondaryTabs,
    {
      type: 'dropdown',
      text: userData?.username || '',
      icon: (
        <span
          style={{
            color: brand.textTertiary,
          }}
        >
          <Icon name="User" />
        </span>
      ),
      items: [
        ...navbarSubloginActions.map((action) => ({
          label: action.link.render ? (
            <action.link.render selected={action.selected} />
          ) : (
            <Item
              icon={action.link.view.icon}
              isExternal={
                !action.link.view.isFederated && action.link.view.isExternal
              }
              label={action.link.view.view.label[language]}
            />
          ),
          selected: action.selected,
          onClick: () => {
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
      <GlobalStyle />
      <Layout2
        headerNavigation={
          <CoreUINavbar
            logo={<Logo src={logo} alt="logo" />}
            rightActions={rightTabs}
            tabs={mainTabs}
            role="navigation"
          />
        }
      >
        {children}
      </Layout2>
    </>
  );
};