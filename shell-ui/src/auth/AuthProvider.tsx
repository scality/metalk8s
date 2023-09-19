import React from 'react';
import { useCallback, useEffect } from 'react';
import { useAuthConfig } from './AuthConfigProvider';
import {
  AuthProvider as OIDCAuthProvider,
  AuthProviderProps,
  UserManager,
  useAuth as useOauth2Auth,
} from 'oidc-react';
import { useShellConfig } from '../initFederation/ShellConfigProvider';
import { getUserGroups } from '../navbar/auth/permissionUtils';
import { MetadataService, WebStorageStateStore } from 'oidc-client';
import type {
  OIDCConfig,
  OAuth2ProxyConfig,
} from '../initFederation/ConfigurationProviders';
import { useQuery } from 'react-query';
import { useErrorBoundary } from 'react-error-boundary';
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { authConfig } = useAuthConfig();

  if (!authConfig) {
    return <>{children}</>;
  }

  if (authConfig.kind === 'OAuth2Proxy') {
    throw new Error('OAuth2Proxy authentication kind is not yet supported');
  }

  return (
    <>
      <OAuth2AuthProvider>{children}</OAuth2AuthProvider>
    </>
  );
}

function defaultDexConnectorMetadataService(connectorId: string) {
  class DexDefaultConnectorMetadataService extends MetadataService {
    getAuthorizationEndpoint() {
      return this._getMetadataProperty('authorization_endpoint').then(
        (authorizationEndpoint) => {
          const queryParamas = new URLSearchParams(window.location.search);

          if (!queryParamas.has('displayLoginChoice')) {
            return authorizationEndpoint + '?connector_id=' + connectorId;
          }

          return authorizationEndpoint;
        },
      );
    }
  }

  return DexDefaultConnectorMetadataService;
}

function getAbsoluteRedirectUrl(redirectUrl?: string) {
  if (!redirectUrl) {
    return window.location.href;
  }

  if (redirectUrl.startsWith('http')) {
    return redirectUrl;
  }

  return window.location.origin + redirectUrl;
}

function OAuth2AuthProvider({ children }: { children: React.ReactNode }) {
  const { authConfig } = useAuthConfig();
  const userManager = new UserManager({
    authority: authConfig.providerUrl,
    client_id: authConfig.clientId,
    redirect_uri: getAbsoluteRedirectUrl(authConfig.redirectUrl),
    silent_redirect_uri: getAbsoluteRedirectUrl(authConfig.redirectUrl),
    post_logout_redirect_uri: getAbsoluteRedirectUrl(authConfig.redirectUrl),
    response_type: authConfig.responseType || 'code',
    scope: authConfig.scopes,
    loadUserInfo: true,
    automaticSilentRenew: true,
    monitorSession: false,
    MetadataServiceCtor: authConfig.defaultDexConnector
      ? defaultDexConnectorMetadataService(authConfig.defaultDexConnector)
      : MetadataService,
    userStore: new WebStorageStateStore({
      store: localStorage,
    }),
  });
  const originalSigninCallBack = userManager.signinCallback.bind(userManager);
  const { showBoundary } = useErrorBoundary();
  userManager.signinCallback = function (url) {
    return originalSigninCallBack(url).catch((e) => {
      showBoundary({
        en: 'We failed to log you in, this might be due to a time synchronization issue between the browser and the server.',
        fr: `Nous n'avons pas réussi à vous connecter, cela peut être dû à une dé-synchronisation de l'heure entre le navigateur et le serveur`,
      });
      throw e;
    });
  };
  const { logOut } = useInternalLogout(userManager, authConfig);
  //Force logout on silent renewal error
  useEffect(() => {
    const onSilentRenewError = (err) => {
      console.log('log out following to silent renewal error', err);
      logOut();
    };

    const reloadWhenUserStorageIsEmpty = () => {
      userManager.getUser().then((user) => {
        if (!user) {
          location.reload();
        }
      });
    };

    window.addEventListener('storage', reloadWhenUserStorageIsEmpty);
    userManager.events.addSilentRenewError(onSilentRenewError);
    return () => {
      userManager.events.removeSilentRenewError(onSilentRenewError);
      window.removeEventListener('storage', reloadWhenUserStorageIsEmpty);
    };
  }, [logOut]);
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
  return <OIDCAuthProvider {...oidcConfig}>{children}</OIDCAuthProvider>;
}

export type UserData = {
  token: string;
  username: string;
  groups: string[];
  email: string;
  id: string;
};

export function useAuth(): {
  userData?: UserData;
} {
  const auth = useOauth2Auth(); // todo add support for OAuth2Proxy

  const { config } = useShellConfig();
  //Force logout when token is expired or we are missing expires_at claims
  useQuery({
    queryKey: ['removeUser'],
    queryFn: () => {
      // This query might be executed when useAuth is rendered simultaneously by 2 different components
      // react-query is supposed to prevent this but in practice under certain conditions a race condition might trigger it twice
      // We need to make sure we don't call removeUser twice in this case (which would cause a redirect loop)
      window.loggingOut = true;
      return auth.userManager.removeUser().then(() => {
        location.reload();
      });
    },
    enabled: !!(
      auth &&
      auth.userManager &&
      auth.userData &&
      (auth.userData.expired || !auth.userData.expires_at) &&
      !window.loggingOut
    ),
  });

  if (!auth || !auth.userData) {
    return {
      userData: undefined,
    };
  }

  return {
    userData: {
      token: auth.userData.access_token,
      username: auth.userData.profile?.name,
      email: auth.userData.profile?.email,
      groups: getUserGroups(auth.userData, config.userGroupsMapping),
      id: auth.userData.profile?.sub,
      original: auth.userData,
    },
  };
}

function useInternalLogout(
  userManager?: UserManager,
  authConfig: OAuth2ProxyConfig | OIDCConfig | undefined,
) {
  return {
    logOut: useCallback(() => {
      if (!authConfig) {
        return;
      }

      if (authConfig.kind === 'OAuth2Proxy') {
        throw new Error('OAuth2Proxy authentication kind is not yet supported');
      }

      if (!userManager) {
        return;
      }

      userManager.revokeAccessToken();

      if (authConfig.providerLogout) {
        userManager.signoutRedirect().catch((e) => {
          if (e.message === 'no end session endpoint') {
            console.log(
              "OIDC provider doesn't support end session endpoint, fallback to clearing document cookies",
            );
            document.cookie.split(';').forEach(function (c) {
              document.cookie =
                c.trim().split('=')[0] +
                '=;' +
                'expires=Thu, 01 Jan 1970 00:00:00 UTC;';
            });
          } else {
            console.error(e);
          }
        });
      } else {
        userManager.removeUser().then(() => {
          location.reload();
        });
      }
    }, [JSON.stringify(authConfig), userManager]),
  };
}

export function useLogOut() {
  const { authConfig } = useAuthConfig();
  let auth;

  try {
    auth = useOauth2Auth();
  } catch (e) {
    //If an exception is raised here it is likely because the app is not using OIDC auth kind, so we can ignore this
    console.log('Failed to retrieve auth informations for OIDC auth kind', e);
  }

  const { logOut } = useInternalLogout(auth?.userManager, authConfig);
  return {
    logOut,
  };
}
