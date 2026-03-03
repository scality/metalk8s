import { ErrorPage401, ErrorPageAuth } from '@scality/core-ui';
import { ReactNode, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { updateAPIConfigAction } from '../ducks/config';
import { UserAccessRight, UserRoles, useTypedSelector, useUserAccessRight, useUserRoles } from '../hooks';
import { useBasenameRelativeNavigate, useShellHooks } from '@scality/module-federation';

export const useAuth = () => {
  const { useAuth } = useShellHooks();
  return useAuth();
};

export const useShellConfig = () => {
  const { useShellConfig } = useShellHooks();
  return useShellConfig();
};

const AccessRouteGuard = ({
  children,
  ...rest
}: {
  children: ReactNode;
  canAccess: (roles: UserRoles, userAccessRight: UserAccessRight) => boolean;
}) => {
  const roles = useUserRoles();
  const userAccessRight = useUserAccessRight();
  const canAccess = rest.canAccess(roles, userAccessRight);

  if (!canAccess) {
    return <ErrorPage401 />;
  }
  return <>{children}</>;
};

type PrivateRouteProps = {
  children: ReactNode;
  path?: string;
  canAccess?: (roles: UserRoles, userAccessRight: UserAccessRight) => boolean;
};

const PrivateRoute = ({ children, ...rest }: PrivateRouteProps) => {
  const canAccess = rest.canAccess ? rest.canAccess : () => true;
  const { language, api } = useTypedSelector((state) => state.config);
  const { isAuthError } = useTypedSelector(
    (state) => state.app.authError,
    (left, right) => left.isAuthError === right.isAuthError,
  );
  const url_support = api?.url_support;
  const { useAuth } = useShellHooks();
  const { userData } = useAuth();
  const navigate = useBasenameRelativeNavigate();

  const dispatch = useDispatch();

  useMemo(() => {
    dispatch(updateAPIConfigAction(userData)); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData?.token]);

  if (isAuthError) {
    return (
      <ErrorPage401
        supportLink={url_support}
        locale={language}
        onReturnHomeClick={() => {
          navigate('/');
        }}
      />
    );
  } else if (userData.token && userData.username) {
    return <AccessRouteGuard canAccess={canAccess}>{children}</AccessRouteGuard>;
  } else {
    return <ErrorPageAuth data-cy="sc-error-pageauth" supportLink={url_support} locale={language} />;
  }
};

export default PrivateRoute;
