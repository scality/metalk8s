//@flow
import React, { useEffect, useLayoutEffect } from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import reactToWebComponent from 'react-to-webcomponent';
import { ThemeProvider as StyledComponentsProvider } from 'styled-components';
import { WebStorageStateStore } from 'oidc-client';
import { AuthProvider, AuthProviderProps, UserManager } from 'oidc-react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Navbar } from './NavBar';
import { UserDataListener } from './UserDataListener';
import { logOut } from './auth/logout';

const EVENTS_PREFIX = 'solutions-navbar--';
export const AUTHENTICATED_EVENT: string = EVENTS_PREFIX + 'authenticated';

type Options = { [path: string]: { en: string, fr: string, roles?: string[] } }; // TODO should be able to accept configs for paths in dropdown menu under user name

export type SolutionsNavbarProps = {
  'oidc-provider-url'?: string,
  scopes?: string,
  'client-id'?: string,
  'response-type'?: string,
  'redirect-url'?: string,
  options?: Options,
  onAuthenticated?: (evt: CustomEvent) => void,
  logOut?: () => void,
  setUserManager?: (userManager: UserManager) => void,
};

type Config = {
  docUrl?: string,
  oidc?: {
    providerUrl?: string,
    redirectUrl?: string,
    clientId?: string,
    responseType?: string,
    scopes?: string,
  },
  options?: Options,
};

// %CONFIG% is replaced at image boot by a provided configuration
const jsonConfig = '%CONFIG%' || '{}';
const config: Config = JSON.parse(jsonConfig);

const SolutionsNavbar = ({
  'oidc-provider-url': oidcProviderUrl,
  scopes,
  'client-id': clientId,
  'redirect-url': redirectUrl,
  'response-type': responseType,
  options,
  onAuthenticated,
  logOut,
  setUserManager,
}: SolutionsNavbarProps) => {
  const userManager = new UserManager({
    authority: oidcProviderUrl || config.oidc?.providerUrl,
    client_id: clientId || config.oidc?.clientId,
    redirect_uri:
      redirectUrl || config.oidc?.redirectUrl || window.location.href,
    silent_redirect_uri:
      redirectUrl || config.oidc?.redirectUrl || window.location.href,
    post_logout_redirect_uri:
      redirectUrl || config.oidc?.redirectUrl || window.location.href,
    response_type: responseType || config.oidc?.responseType || 'code',
    scope: scopes || config.oidc?.scopes,
    loadUserInfo: true,
    automaticSilentRenew: true,
    monitorSession: false,
    userStore: new WebStorageStateStore({ store: localStorage }),
  });

  useEffect(() => {
    if (setUserManager) {
      setUserManager(userManager);
    }
  }, [!setUserManager]);

  const oidcConfig: AuthProviderProps = {
    onBeforeSignIn: () => {
      localStorage.setItem('redirectUrl', window.location.href);
    },
    onSignIn: () => {
      const savedRedirectUri = localStorage.getItem('redirectUrl');
      if (savedRedirectUri) {
        location.href = savedRedirectUri;
      } else {
        const searchParams = new URLSearchParams(location.search);
        searchParams.delete('state');
        searchParams.delete('session_state');
        searchParams.delete('code');
        location.search = searchParams.toString();
        location.hash = '';
      }
    },
    userManager,
  };

  return (
    <AuthProvider {...oidcConfig}>
      <UserDataListener onAuthenticated={onAuthenticated} />
      <StyledComponentsProvider
        theme={{
          // todo manages theme https://github.com/scality/metalk8s/issues/2545
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
        <Navbar options={options} />
      </StyledComponentsProvider>
    </AuthProvider>
  );
};

SolutionsNavbar.propTypes = {
  'oidc-provider-url': PropTypes.string.isRequired,
  scopes: PropTypes.string.isRequired,
  'client-id': PropTypes.string.isRequired,
  'redirect-url': PropTypes.string,
  'response-type': PropTypes.string,
  options: PropTypes.object,
};

const SolutionsNavbarProviderWrapper = (props: SolutionsNavbarProps) => {
  const client = new QueryClient();
  return (
    <QueryClientProvider client={client}>
      <SolutionsNavbar {...props} />
    </QueryClientProvider>
  );
};

SolutionsNavbarProviderWrapper.propTypes = SolutionsNavbar.propTypes;

class SolutionsNavbarWebComponent extends reactToWebComponent(
  SolutionsNavbar,
  React,
  ReactDOM,
) {
  constructor() {
    super();
    this.setUserManager = (userManager: UserManager) => {
      this.userManager = userManager;
    };
    this.onAuthenticated = (evt: CustomEvent) => {
      this.dispatchEvent(evt);
    };
    this.logOut = () => {
      logOut(this.userManager);
    };
  }
}

customElements.define('solutions-navbar', SolutionsNavbarWebComponent);
