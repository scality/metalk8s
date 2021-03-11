//@flow
import React, { useEffect, useLayoutEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import reactToWebComponent from 'react-to-webcomponent';
import { ThemeProvider as StyledComponentsProvider } from 'styled-components';
import { WebStorageStateStore } from 'oidc-client';
import { AuthProvider, AuthProviderProps, UserManager } from 'oidc-react';
import { QueryClient, QueryClientProvider, useQuery } from 'react-query';
import { LoadingNavbar, Navbar } from './NavBar';
import { UserDataListener } from './UserDataListener';
import { logOut } from './auth/logout';
import { prefetch } from "quicklink";
import {defaultTheme} from '@scality/core-ui/dist/style/theme';

const EVENTS_PREFIX = 'solutions-navbar--';
export const AUTHENTICATED_EVENT: string = EVENTS_PREFIX + 'authenticated';

export type TranslationAndGroups = { en: string, fr: string, groups?: string[], activeIfMatches?: string };
export type MenuItems = {[path: string]: TranslationAndGroups }

export type Options = { main: MenuItems, subLogin: MenuItems };

export type UserGroupsMapping = {[email: string]: string[]};

export type SolutionsNavbarProps = {
  'oidc-provider-url'?: string,
  scopes?: string,
  'client-id'?: string,
  'response-type'?: string,
  'redirect-url'?: string,
  'config-url'?: string,
  options?: string,
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
  userGroupsMapping?: UserGroupsMapping
};

const SolutionsNavbar = ({
  'oidc-provider-url': oidcProviderUrl,
  scopes,
  'client-id': clientId,
  'redirect-url': redirectUrl,
  'config-url': configUrl,
  'response-type': responseType,
  options,
  onAuthenticated,
  logOut,
  setUserManager,
}: SolutionsNavbarProps) => {
  const { data: config, status } = useQuery<Config>('navbarConfig', () => {
    if (configUrl) {
      return fetch(configUrl).then((r) => {
        if (r.ok) {
          return r.json();
        } else {
          return Promise.reject();
        }
      });
    }
    return Promise.resolve({});
  },
  );

  useLayoutEffect(() => {
    const savedRedirectUri = localStorage.getItem('redirectUrl');
    if (savedRedirectUri) {
      prefetch(savedRedirectUri)
    }
  }, []);

  switch (status) {
    case 'idle':
    case 'loading':
    default:
      return <LoadingNavbar />;
    case 'error':
      return <>Failed to load navbar configuration</>; // TODO redirects to a beautiful error page
    case 'success': {
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

      const computedMenuOptions = options ? JSON.parse(options) : config.options || { main: {}, subLogin: {} };

      if (setUserManager) {
        setUserManager(userManager);
      }

      const oidcConfig: AuthProviderProps = {
        onBeforeSignIn: () => {
          localStorage.setItem('redirectUrl', window.location.href);
        },
        onSignIn: () => {
          const savedRedirectUri = localStorage.getItem('redirectUrl');
          localStorage.removeItem('redirectUrl');
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
          <UserDataListener userGroupsMapping={config.userGroupsMapping} onAuthenticated={onAuthenticated} />
          <StyledComponentsProvider
            theme={{
              // todo manages theme https://github.com/scality/metalk8s/issues/2545
              brand: defaultTheme.dark,
              logo_path: '/brand/assets/branding-dark.svg',
            }}
          >
            <Navbar options={computedMenuOptions} userGroupsMapping={config.userGroupsMapping} />
          </StyledComponentsProvider>
        </AuthProvider>
      );
    }
  }
};

SolutionsNavbar.propTypes = {
  'oidc-provider-url': PropTypes.string,
  scopes: PropTypes.string,
  'client-id': PropTypes.string,
  'config-url': PropTypes.string,
  'redirect-url': PropTypes.string,
  'response-type': PropTypes.string,
  options: PropTypes.string,
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
  SolutionsNavbarProviderWrapper,
  React,
  ReactDOM,
) {
  constructor() {
    super();
    this.setUserManager = (userManager: UserManager) => {
      window.userManager = userManager;
    };
    this.onAuthenticated = (evt: CustomEvent) => {
      this.dispatchEvent(evt);
    };
    this.logOut = () => {
      logOut(window.userManager);
    };
  }
}

customElements.define('solutions-navbar', SolutionsNavbarWebComponent);
