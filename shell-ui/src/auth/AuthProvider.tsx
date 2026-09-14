import { MetadataService, type User, WebStorageStateStore } from 'oidc-client-ts';
import { type AuthContextProps, type AuthProviderProps, AuthProvider as OIDCAuthProvider, UserManager, useAuth as useOauth2Auth } from 'oidc-react';
import type React from 'react';
import { useCallback, useEffect, useMemo } from 'react';
import { useErrorBoundary } from 'react-error-boundary';
import type { OAuth2ProxyConfig, OIDCConfig } from '../initFederation/ConfigurationProviders';
import { useShellConfig } from '../initFederation/ShellConfigProvider';
import { getUserGroups } from '../navbar/auth/permissionUtils';
import { useAuthConfig } from './AuthConfigProvider';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { authConfig } = useAuthConfig();

  if (!authConfig) {
    return <>{children}</>;
  }

  if (authConfig.kind === 'OAuth2Proxy') {
    throw new Error('OAuth2Proxy authentication kind is not yet supported');
  }

  return (
    <OAuth2AuthProvider>{children}</OAuth2AuthProvider>
  );
}

function defaultDexConnectorMetadataService(connectorId: string) {
  class DexDefaultConnectorMetadataService extends MetadataService {
    getAuthorizationEndpoint() {
      return this._getMetadataProperty('authorization_endpoint').then((authorizationEndpoint) => {
        const queryParamas = new URLSearchParams(window.location.search);

        if (!queryParamas.has('displayLoginChoice')) {
          return authorizationEndpoint + '?connector_id=' + connectorId;
        }

        return authorizationEndpoint as string;
      });
    }
  }

  return DexDefaultConnectorMetadataService;
}

export function getAbsoluteRedirectUrl(redirectUrl?: string) {
  if (!redirectUrl) {
    return window.location.href;
  }

  if (redirectUrl.startsWith('http')) {
    return redirectUrl;
  }

  return window.location.origin + redirectUrl;
}

function buildUserManager(
  authConfig: OIDCConfig,
  showBoundary: (error: unknown) => void,
): UserManager {
  const { providerUrl, clientId, redirectUrl, responseType, scopes, defaultDexConnector } = authConfig;

  const manager = new UserManager({
    authority: providerUrl,
    client_id: clientId,
    redirect_uri: getAbsoluteRedirectUrl(redirectUrl),
    silent_redirect_uri: getAbsoluteRedirectUrl(redirectUrl),
    post_logout_redirect_uri: getAbsoluteRedirectUrl(redirectUrl),
    response_type: responseType || 'code',
    scope: scopes,
    loadUserInfo: true,
    automaticSilentRenew: true,
    monitorSession: false,
    MetadataServiceCtor: defaultDexConnector
      ? defaultDexConnectorMetadataService(defaultDexConnector)
      : MetadataService,
    // @ts-expect-error - FIXME when you are working on it
    userStore: new WebStorageStateStore({
      store: localStorage,
    }),
  });

  const originalSigninCallBack = manager.signinCallback.bind(manager);
  manager.signinCallback = (url) =>
    originalSigninCallBack(url).catch((e) => {
      showBoundary({
        en: 'We failed to log you in, this might be due to a time synchronization issue between the browser and the server.',
        fr: `Nous n'avons pas réussi à vous connecter, cela peut être dû à une dé-synchronisation de l'heure entre le navigateur et le serveur`,
      });
      throw e;
    });

  return manager;
}

function buildOidcConfig(userManager: UserManager): AuthProviderProps {
  return {
    onBeforeSignIn: () => {
      localStorage.setItem('redirectUrl', window.location.href);
      return window.location.href;
    },
    onSignIn: () => {
      const savedRedirectUri = localStorage.getItem('redirectUrl');
      localStorage.removeItem('redirectUrl');

      if (savedRedirectUri) {
        location.href = savedRedirectUri;
        return;
      }

      const searchParams = new URLSearchParams(location.search);
      searchParams.delete('state');
      searchParams.delete('session_state');
      searchParams.delete('code');
      location.search = searchParams.toString();
      location.hash = '';
    },
    userManager,
  };
}

function OAuth2AuthProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const { authConfig } = useAuthConfig();
  if (authConfig.kind === 'OAuth2Proxy') {
    throw new Error('OAuth2Proxy authentication kind is not yet supported');
  }

  const { showBoundary } = useErrorBoundary();

  const { providerUrl, clientId, redirectUrl, responseType, scopes, defaultDexConnector } = authConfig;

  const userManager = useMemo(
    () => buildUserManager(authConfig, showBoundary),
    [providerUrl, clientId, redirectUrl, responseType, scopes, defaultDexConnector, showBoundary],
  );

  useEffect(() => {
    return () => {
      userManager.stopSilentRenew();
    };
  }, [userManager]);

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
  }, [logOut, userManager]);

  return (
    <OIDCAuthProvider {...buildOidcConfig(userManager)}>
      <ExpiryWatcher userManager={userManager} />
      {children}
    </OIDCAuthProvider>
  );
}

// useOauth2Auth() requires an OIDCAuthProvider ancestor, so the expiry-check
// must live inside OIDCAuthProvider — not in OAuth2AuthProvider, which is the parent.
function ExpiryWatcher({ userManager }: { userManager: UserManager }): null {
  const auth = useOauth2Auth();

  // Handle token expiration with a double-check mechanism.
  //
  // React state (auth.userData) and localStorage can get out of sync: when silent
  // renew refreshes the token in localStorage, React state still shows the old
  // expired token until the next re-render. To avoid an incorrect logout we
  // re-read userManager.getUser() (localStorage) before removing the user.
  //
  // "Expired" here means `expired === true` OR `expires_at` missing — treating
  // unknown-expiry as expired guards against corrupt User records.
  useEffect(() => {
    const userData = auth?.userData;
    if (!userData) return;
    const userIsExpired = userData.expired || !userData.expires_at;
    if (!userIsExpired) return;

    userManager
      .getUser()
      .then((localStorageUser) => {
        const isActuallyExpired =
          localStorageUser?.expired || !localStorageUser?.expires_at;
        if (isActuallyExpired) {
          return userManager.removeUser().then(() => {
            location.reload();
          });
        }
      })
      .catch((err) => {
        console.error('ExpiryWatcher: failed to verify/remove expired user', err);
      });
  }, [auth?.userData, userManager]);

  return null;
}

export type UserData = {
  token: string;
  username: string;
  groups: string[];
  email: string;
  id: string;
  original: User;
};

export function useAuth(): {
  userData?: UserData;
  getToken: () => Promise<string | null>;
} {
  try {
    const auth = useOauth2Auth(); // todo add support for OAuth2Proxy

    const { config } = useShellConfig();

    if (!auth || !auth.userData) {
      return {
        userData: undefined,
        getToken: () => Promise.resolve(null),
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
      getToken: async () => {
        return auth.userManager.getUser().then((user) => {
          return user?.access_token;
        });
      },
    };
  } catch (e) {
    return {
      userData: undefined,
      getToken: () => Promise.resolve('null'),
    };
  }
}

function getOidcConfigFields(
  authConfig: OAuth2ProxyConfig | OIDCConfig | undefined,
): OIDCConfig | undefined {
  if (!authConfig || authConfig.kind === 'OAuth2Proxy') {
    return undefined;
  }
  return authConfig;
}

function useInternalLogout(
  userManager?: UserManager,
  // @ts-expect-error - FIXME when you are working on it
  authConfig: OAuth2ProxyConfig | OIDCConfig | undefined,
): { logOut: () => void } {
  const oidcConfig = getOidcConfigFields(authConfig);

  const providerUrl = oidcConfig?.providerUrl;
  const clientId = oidcConfig?.clientId;
  const redirectUrl = oidcConfig?.redirectUrl;
  const responseType = oidcConfig?.responseType;
  const scopes = oidcConfig?.scopes;
  const defaultDexConnector = oidcConfig?.defaultDexConnector;
  const providerLogout = oidcConfig?.providerLogout;
  const kind = authConfig?.kind;

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

      if (authConfig.providerLogout) {
        userManager.signoutRedirect().catch((e) => {
          if (e.message === 'no end session endpoint') {
            console.log("OIDC provider doesn't support end session endpoint, fallback to clearing document cookies");
            document.cookie.split(';').forEach((c) => {
              document.cookie = `${c.trim().split('=')[0]}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;`;
            });
          } else {
            console.error(e);
          }
        });
      } else {
        userManager.revokeTokens().then(() => {
          userManager.removeUser().then(() => {
            location.reload();
          });
        });
      }
    }, [kind, providerUrl, clientId, redirectUrl, responseType, scopes, defaultDexConnector, providerLogout, userManager]),
  };
}

export function useLogOut() {
  const { authConfig } = useAuthConfig();
  let auth: AuthContextProps;

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
