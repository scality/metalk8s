import { ErrorPage401, ErrorPageAuth } from '@scality/core-ui';
import { ReactNode, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router';
import { Route } from 'react-router-dom';
import { updateAPIConfigAction } from '../ducks/config';
import {
  UserAccessRight,
  UserRoles,
  useTypedSelector,
  useUserAccessRight,
  useUserRoles,
} from '../hooks';

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
