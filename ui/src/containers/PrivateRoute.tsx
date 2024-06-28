import React, { ReactNode, createContext, useMemo } from 'react';
import { Route } from 'react-router-dom';
import { useHistory } from 'react-router';
import { ErrorPage500, ErrorPageAuth, ErrorPage401 } from '@scality/core-ui';
import {
  UserAccessRight,
  UserRoles,
  useTypedSelector,
  useUserAccessRight,
  useUserRoles,
} from '../hooks';
import { ComponentWithFederatedImports } from '@scality/module-federation';
import { useDispatch } from 'react-redux';
import { updateAPIConfigAction } from '../ducks/config';

// Start of copy paste from /shell-ui/src/initFederation/ShellConfigProvider.tsx
export type NavbarEntry = {
  groups?: string[];
  label?: {
    en: string;
    fr: string;
  };
  kind?: string;
  view?: string;
  url?: string;
  icon?: string;
  isExternal: boolean;
};

export type UserGroupsMapping = Record<string, string[]>;

// Will be removed when zenko-ui -> module federation
export type Options = {
  main: {
    [key: string]: Entry;
  };
  subLogin: {
    [key: string]: Entry;
  };
};

export type Entry = {
  en: string;
  fr: string;
  icon?: string;
  groups?: string[];
  isExternal?: boolean;
  order?: number;
  activeIfMatches?: string;
};

// config fetched from /shell/config.json
export type ShellJSONFileConfig = {
  discoveryUrl: string;
  navbar: {
    main: NavbarEntry[];
    subLogin: NavbarEntry[];
  };
  productName: string;

  // optional (in dev mode)
  // TODO : Themes and Logo seems duplicated, check why
  themes?: {
    dark?: { logoPath: string };
    darkRebrand?: { logoPath: string };
    light?: { logoPath: string };
  };
  logo?: {
    dark?: string;
    darkRebrand?: string;
    light?: string;
  };
  favicon?: string;

  // for IDP that does not support user groups (ie: Dex)
  userGroupsMapping?: UserGroupsMapping;
  // Legacy, will be removed when zenko-ui -> module federation
  options?: Options;
  // Not yet used and working
  canChangeLanguage?: boolean;
  canChangeTheme?: boolean;
};

export type ShellConfig = {
  config: ShellJSONFileConfig;
  favicon: Pick<ShellJSONFileConfig, 'favicon'>;
  themes: Pick<ShellJSONFileConfig, 'themes'>;
  status: 'idle' | 'loading' | 'success' | 'error';
};

// End of copy paste from /shell-ui/src/initFederation/ShellConfigProvider.tsx

const ShellUIContext = createContext<{
  useAuth: () => {
    userData?: {
      token: string;
      username: string;
      groups: string[];
      email: string;
      id: string;
    };
  };
  useShellConfig: () => ShellConfig;
} | null>(null);

export const useAuth = () => {
  return window.shellHooks.useAuth();
};

export const useShellConfig = () => {
  return window.shellHooks.useShellConfig();
};

const AccessRouteGuard = ({ component, ...rest }) => {
  const roles = useUserRoles();
  const userAccessRight = useUserAccessRight();
  const canAccess = rest.canAccess(roles, userAccessRight);

  if (!canAccess) {
    return <ErrorPage401 />;
  }
  return <Route {...rest} component={component} />;
};

const PrivateRoute = ({ component, ...rest }: PrivateRouteProps) => {
  rest.canAccess = rest.canAccess ? rest.canAccess : () => true;
  const { language, api } = useTypedSelector((state) => state.config);
  const { isAuthError } = useTypedSelector(
    (state) => state.app.authError,
    (left, right) => left.isAuthError === right.isAuthError,
  );
  const url_support = api?.url_support;
  const { userData } = window.shellHooks.useAuth();

  const dispatch = useDispatch();
  const history = useHistory();

  useMemo(() => {
    dispatch(updateAPIConfigAction(userData)); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData?.token]);

  if (isAuthError) {
    return (
      <ErrorPage401
        supportLink={url_support}
        locale={language}
        onReturnHomeClick={() => {
          history.push('/');
        }}
      />
    );
  } else if (userData.token && userData.username) {
    return <AccessRouteGuard {...rest} component={component} />;
  } else {
    return (
      <ErrorPageAuth
        data-cy="sc-error-pageauth"
        supportLink={url_support}
        locale={language}
      />
    );
  }
};
type PrivateRouteProps = {
  component: ReactNode;
  path: string;
  exact?: boolean;
  canAccess?: (roles: UserRoles, userAccessRight: UserAccessRight) => boolean;
};

export default PrivateRoute;
