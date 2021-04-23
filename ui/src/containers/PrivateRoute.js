import React from 'react';
import { useSelector } from 'react-redux';
import { Route } from 'react-router-dom';
import { ErrorPageAuth } from '@scality/core-ui';
import { useTypedSelector } from '../hooks';

const PrivateRoute = ({ component, location, ...rest }) => {
  const { language, api } = useTypedSelector((state) => state.config);
  const url_support = api?.url_support;
  const authenticated = useSelector((state) => !!state.oidc.user);

  if (authenticated) {
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

export default PrivateRoute;
