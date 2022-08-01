import React, { useMemo } from 'react';
import { Route } from 'react-router-dom';
import { useHistory } from 'react-router';
import { ErrorPage500, ErrorPageAuth, ErrorPage401 } from '@scality/core-ui';
import { useTypedSelector } from '../hooks';
import { ComponentWithFederatedImports } from '@scality/module-federation';
import { useDispatch } from 'react-redux';
import { updateAPIConfigAction } from '../ducks/config';

const InternalPrivateRoute = ({
  moduleExports,
  component,
  location,
  ...rest
}) => {
  const { language, api } = useTypedSelector((state) => state.config);
  const { isAuthError } = useTypedSelector((state) => state.app.authError);
  const url_support = api?.url_support;
  const { userData } = moduleExports['./auth/AuthProvider'].useAuth();
  const dispatch = useDispatch();
  const history = useHistory();

  useMemo(() => {
    dispatch(updateAPIConfigAction(userData));
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    return <Route {...rest} component={component} />;
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

const PrivateRoute = ({ ...props }) => {
  return (
    <ComponentWithFederatedImports
      componentWithInjectedImports={InternalPrivateRoute}
      componentProps={props}
      renderOnError={<ErrorPage500 />}
      federatedImports={[
        {
          remoteEntryUrl: window.shellUIRemoteEntryUrl,
          scope: 'shell',
          module: './auth/AuthProvider',
        },
      ]}
    />
  );
};

export default PrivateRoute;
