import React from 'react';
import { useSelector } from 'react-redux';
import { Route } from 'react-router-dom';

const PrivateRoute = ({ component, ...rest }) => {
  const authenticated = useSelector((state) => !!state.oidc.user);
  const userManager = useSelector((state) => state.config.userManager);
  const isSaltAPIAuthenticated = useSelector((state) => state.login.salt);

  if (!authenticated) {
    // Go to Dex Login Form if not authenticated
    userManager.signinRedirect({
      data: { path: window.location.pathname },
    });
    return null;
  } else if (isSaltAPIAuthenticated) {
    // To make sure that Salt API is authenticated, before load the components
    // Otherwise we may get 401 Unauthorized
    return <Route {...rest} component={component} />;
  } else {
    return null;
  }
};

export default PrivateRoute;
