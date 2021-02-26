//@flow
import CoreUINavbar from '@scality/core-ui/dist/components/navbar/Navbar.component';
import { useAuth } from 'oidc-react';
import { useLayoutEffect, useState } from 'react';
import type { Options, SolutionsNavbarProps } from './index';
import type { Node } from 'react';
import { logOut } from './auth/logout';
import { options } from 'jest-runtime/build/cli/args';

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
              selected: normalizedLocation === normalizePath(path),
            };
          } catch (e) {
            throw new Error(
              `[navbar][config] Options path should be provided thanks to fully qualified urls such as {protocol}://{host}{path}?{queryParams} but got "${path}" in ${section}[${i}] `,
            );
          }
        },
      )
  );
};

export const Navbar = ({ options }: { options: Options }): Node => {
  const auth = useAuth();

  const tabs = translateOptionsToMenu(options, 'main');

  const rightActions = [
    {
      type: 'dropdown',
      text: auth.userData?.profile.name || '',
      icon: <i className="fas fa-user" />,
      items: [
        ...translateOptionsToMenu(options, 'subLogin'),
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
