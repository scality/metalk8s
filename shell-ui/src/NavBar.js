//@flow
import CoreUINavbar from '@scality/core-ui/dist/components/navbar/Navbar.component';
import Dropdown from '@scality/core-ui/dist/components/dropdown/Dropdown.component';
import { type Item as CoreUIDropdownItem } from '@scality/core-ui/src/lib/components/dropdown/Dropdown.component';
import { useAuth } from 'oidc-react';
import { useLayoutEffect, useState } from 'react';
import type {
  Options,
  SolutionsNavbarProps,
  PathDescription,
  UserGroupsMapping,
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

export const LoadingNavbar = (): Node => (
  <CoreUINavbar role="navigation" tabs={[{ title: 'loading' }]} />
);

const translateOptionsToMenu = (
  options: Options,
  section: 'main' | 'subLogin',
  renderer: (
    path: string,
    pathDescription: PathDescription,
  ) => { link: Node } | { label: string, onClick: () => void },
  userGroups: string[],
) => {
  const normalizedLocation = normalizePath(location.href);
  return (
    Object.entries(options[section])
      //$FlowIssue - flow typing for Object.entries incorrectly typing values as [string, mixed] instead of [string, PathDescription]
      .filter((entry: [string, PathDescription]) =>
        isEntryAccessibleByTheUser(entry, userGroups),
      )
      .map(
        //$FlowIssue - flow typing for Object.entries incorrectly typing values as [string, mixed] instead of [string, PathDescription]
        ([path, pathDescription]: [string, PathDescription], i) => {
          try {
            return {
              ...renderer(path, pathDescription),
              selected: pathDescription.activeIfMatches
                ? new RegExp(pathDescription.activeIfMatches).test(
                    location.href,
                  )
                : normalizedLocation === normalizePath(path),
            };
          } catch (e) {
            throw new Error(
              `[navbar][config] Invalid path specified in "options.${section}": "${path}" ` +
                '(keys must be defined as fully qualified URLs, ' +
                'such as "{protocol}://{host}{path}?{queryParams}")',
            );
          }
        },
      )
  );
};

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
    <div style={{ display: 'flex', width: '200px', alignItems: 'center' }}>
      {icon && (
        <div style={{ padding: '10px', color: brand.textSecondary }}>
          <i className={icon} />
        </div>
      )}
      <div style={{ flexGrow: '1' }}>{label}</div>
      {isExternal && (
        <div style={{ padding: '10px', color: brand.secondary }}>
          <i className="fas fa-external-link-alt" />
        </div>
      )}
    </div>
  );
};

export const Navbar = ({
  options,
  userGroupsMapping,
}: {
  options: Options,
  userGroupsMapping?: UserGroupsMapping,
}): Node => {
  const auth = useAuth();
  const brand = useTheme();

  const { themeName, unSelectedThemes, setTheme } = useThemeName();
  const { language, setLanguage, unSelectedLanguages } = useLanguage();

  const userGroups: string[] = getUserGroups(auth.userData, userGroupsMapping);
  const accessiblePaths = getAccessiblePathsFromOptions(options, userGroups);
  useLayoutEffect(() => {
    accessiblePaths.forEach((accessiblePath) => {
      prefetch(accessiblePath);
    });
  }, [JSON.stringify(accessiblePaths)]);

  const tabs = translateOptionsToMenu(
    options,
    'main',
    (path, pathDescription) => ({
      link: <a href={path}>{pathDescription[language]}</a>,
    }),
    userGroups,
  );

  const rightActions = [
    {
      type: 'dropdown',
      text: language,
      items: unSelectedLanguages.map((lang) => ({
        label: lang,
        onClick: () => {
          setLanguage(lang);
        },
      })),
    },
    {
      type: 'dropdown',
      text: themeName,
      items: unSelectedThemes.map((theme) => ({
        label: theme,
        onClick: () => {
          setTheme(theme);
        },
      })),
    },
    {
      type: 'dropdown',
      text: auth.userData?.profile.name || '',
      icon: <span style={{color: brand.textPrimary}}><i className="fas fa-user" /></span>,
      items: [
        ...translateOptionsToMenu(
          options,
          'subLogin',
          (path, pathDescription) => ({
            label: (
              // $FlowFixMe Dropdown item typing is currently a string but can also accepts a react node
              <Item
                icon={pathDescription.icon}
                isExternal={pathDescription.isExternal}
                label={pathDescription.en}
              />
            ),
            onClick: () => {
              if (pathDescription.isExternal) {
                window.open(path, '_blank');
              } else {
                location.href = path;
              }
            },
          }),
          userGroups,
        ),
        {
          label: <Item icon={'fas fa-sign-out-alt'} label={language === 'en' ? 'Log Out' : 'Déconnexion'} />,
          onClick: () => {
            logOut(auth.userManager);
          },
        },
      ],
    },
  ];

  return (
    <CoreUINavbar rightActions={rightActions} tabs={tabs} role="navigation" />
  );
};
