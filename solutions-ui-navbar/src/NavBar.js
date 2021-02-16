//@flow
import CoreUINavbar from '@scality/core-ui/dist/components/navbar/Navbar.component';
import { useAuth } from 'oidc-react';
import { useLayoutEffect, useState } from 'react';
import type { SolutionsNavbarProps } from './index';
import type { Node } from 'react';
import { logOut } from './auth/logout';

export const Navbar = ({
  options,
}: {
  options: $PropertyType<SolutionsNavbarProps, 'options'>,
}): Node => {
  const auth = useAuth();

  const tabs = [
    {
      selected: true,
      title: 'Overview',
      onClick: () => console.log('Overview'),
    },
  ];
  const rightActions = [
    {
      type: 'dropdown',
      text: 'FR',
      icon: <i className="fas fa-globe" />,
      items: [
        {
          label: 'English',
          name: 'EN',
          onClick: () => console.log('en'),
        },
      ],
    },
    {
      type: 'dropdown',
      icon: <i className="fas fa-question-circle" />,
      items: [
        { label: 'About', onClick: () => console.log('About clicked') },
        {
          label: 'Documentation',
          onClick: () => console.log('Documentation clicked'),
        },
        {
          label: 'Onboarding',
          onClick: () => console.log('Onboarding clicked'),
        },
      ],
    },
    {
      type: 'button',
      icon: <i className="fas fa-sun" />,
      onClick: () => console.log('Theme toggle clicked'),
    },
    {
      type: 'dropdown',
      text: auth.userData?.profile.name || '',
      icon: <i className="fas fa-user" />,
      items: [
        {
          label: 'Log out',
          onClick: () => {
            logOut(auth.userManager);
          },
        },
      ],
    },
  ];
  return <CoreUINavbar rightActions={rightActions} tabs={tabs} role="navigation" />;
};
