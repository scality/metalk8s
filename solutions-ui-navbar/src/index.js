//@flow
import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import reactToWebComponent from 'react-to-webcomponent';
import Navbar from '@scality/core-ui/dist/components/navbar/Navbar.component';
import { ThemeProvider as StyledComponentsProvider } from 'styled-components';

type SolutionsNavbarProps = {
  'oidc-provider-url': string,
  scopes: string,
  'client-id': string,
  options: { [path: string]: { en: string, fr: string } },
};

const SolutionsNavbar = ({
  'oidc-provider-url': oidcProviderUrl,
  scopes,
  'client-id': clientId,
  options,
}: SolutionsNavbarProps) => {
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
      text: 'Carlito',
      icon: <i className="fas fa-user" />,
      items: [
        { label: 'Log out', onClick: () => console.log('Logout clicked') },
      ],
    },
  ];

  return (
    <StyledComponentsProvider
      theme={{
        brand: {
          alert: '#FFE508',
          base: '#7B7B7B',
          primary: '#1D1D1D',
          primaryDark1: '#171717',
          primaryDark2: '#0A0A0A',
          secondary: '#055DFF',
          secondaryDark1: '#1C3D59',
          secondaryDark2: '#1C2E3F',
          success: '#006F62',
          healthy: '#30AC26',
          healthySecondary: '#69E44C',
          warning: '#FFC10A',
          danger: '#AA1D05',
          critical: '#BE321F',
          background: '#121212',
          backgroundBluer: '#192A41',
          textPrimary: '#FFFFFF',
          textSecondary: '#B5B5B5',
          textTertiary: '#DFDFDF',
          borderLight: '#A5A5A5',
          border: '#313131',
          info: '#434343',
        },
        logo_path: '/brand/assets/branding-dark.svg',
      }}
    >
      <Navbar rightActions={rightActions} tabs={tabs} />
    </StyledComponentsProvider>
  );
};

SolutionsNavbar.propTypes = {
  'oidc-provider-url': PropTypes.string.isRequired,
  scopes: PropTypes.string.isRequired,
  'client-id': PropTypes.string.isRequired,
  'redirect-url': PropTypes.string,
  options: PropTypes.object,
};

const SolutionsNavbarWebComponent = reactToWebComponent(
  SolutionsNavbar,
  React,
  ReactDOM,
);

customElements.define('solutions-navbar', SolutionsNavbarWebComponent);
