//@flow
import { type Node } from 'react';
import { useAuthConfig } from './AuthConfigProvider';
import {
  AuthProvider as OIDCAuthProvider,
  AuthProviderProps,
  UserManager,
  useAuth as useOauth2Auth,
} from 'oidc-react';
import { useShellConfig } from '../initFederation/ShellConfigProvider';
import { getUserGroups } from '../navbar/auth/permissionUtils';
import { WebStorageStateStore } from 'oidc-client';

export function AuthProvider({ children }: { children: Node }) {
  const { authConfig } = useAuthConfig();

  if (!authConfig) {
    return <>{children}</>;
  }

  if (authConfig.kind === 'OAuth2Proxy') {
    throw new Error('Not yet supproted');
  }

  return <OAuth2AuthProvider>{children}</OAuth2AuthProvider>;
}

function OAuth2AuthProvider({ children }: { children: Node }) {
  const { authConfig } = useAuthConfig();

  const userManager = new UserManager({
    authority: authConfig.providerUrl,
    client_id: authConfig.clientId,
    redirect_uri: authConfig.redirectUrl || window.location.href,
    silent_redirect_uri: authConfig.redirectUrl || window.location.href,
    post_logout_redirect_uri: authConfig.redirectUrl || window.location.href,
    response_type: authConfig.responseType || 'code',
    scope: authConfig.scopes,
    loadUserInfo: true,
    automaticSilentRenew: true,
    monitorSession: false,
    userStore: new WebStorageStateStore({ store: localStorage }),
  });

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

export function useAuth(): {
  userData?: { token: string, username: string, groups: string[], email: string },
} {
  const auth = useOauth2Auth(); // todo add support for OAuth2Proxy
  const { config } = useShellConfig();
  if (!auth || !auth.userData) {
    return { userData: undefined };
  }

  return {
    userData: {
      token: auth.userData.id_token,
      username: auth.userData.profile?.name,
      email: auth.userData.profile?.email,
      groups: getUserGroups(auth.userData, config.userGroupsMapping),
    },
  };
}
