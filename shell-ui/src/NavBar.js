//@flow
import CoreUINavbar from '@scality/core-ui/dist/components/navbar/Navbar.component';
import { useAuth } from 'oidc-react';
import { useLayoutEffect, useState } from 'react';
import type {
  Options,
  SolutionsNavbarProps,
  TranslationAndGroups,
  UserGroupsMapping
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

export const LoadingNavbar = (): Node => (
  <CoreUINavbar role="navigation" tabs={[{ title: 'loading' }]} />
);

const translateOptionsToMenu = (
  options: Options,
  section: 'main' | 'subLogin',
  renderer: (
    path: string,
    translationAndGroup: TranslationAndGroups,
  ) => { link: Node } | { label: string, onClick: () => void },
  userGroups: string[],
) => {
  const normalizedLocation = normalizePath(location.href);
  return (
    Object.entries(options[section])
      //$FlowIssue - flow typing for Object.entries incorrectly typing values as [string, mixed] instead of [string, TranslationAndGroups]
      .filter((entry: [string, TranslationAndGroups]) =>
        isEntryAccessibleByTheUser(entry, userGroups),
      )
      .map(
        //$FlowIssue - flow typing for Object.entries incorrectly typing values as [string, mixed] instead of [string, TranslationAndGroups]
        ([path, translationAndGroup]: [string, TranslationAndGroups], i) => {
          try {
            return {
              ...renderer(path, translationAndGroup),
              selected: translationAndGroup.activeIfMatches
                ? new RegExp(translationAndGroup.activeIfMatches).test(
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

export const Navbar = ({ options, userGroupsMapping }: { options: Options, userGroupsMapping?: UserGroupsMapping }): Node => {
  const auth = useAuth();

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
    (path, translationAndGroup) => ({
      link: <a href={path}>{translationAndGroup.en}</a>,
    }),
    userGroups,
  );

  const rightActions = [
    {
      type: 'dropdown',
      text: auth.userData?.profile.name || '',
      icon: <i className="fas fa-user" />,
      items: [
        ...translateOptionsToMenu(
          options,
          'subLogin',
          (path, translationAndGroup) => ({
            label: translationAndGroup.en,
            onClick: () => {
              location.href = path;
            },
          }),
          userGroups,
        ),
        {
          label: 'Log out',
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
