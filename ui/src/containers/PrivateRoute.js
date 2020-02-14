import React from 'react';
import { useSelector } from 'react-redux';
import { Route } from 'react-router-dom';

const PrivateRoute = ({ component, ...rest }) => {
  /*   const authenticated = useSelector(state => !!state.oidc.user);
  const userManager = useSelector(state => state.config.userManager);

  if (!authenticated) {
    userManager.signinRedirect({
      data: { path: window.location.pathname },
    }); //Go to Dex Login Form if not authenticated
    return null;
  } else {
    return <Route {...rest} component={component} />;
  } */

  return <Route {...rest} component={component} />;
};

export default PrivateRoute;
