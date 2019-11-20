import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Route } from 'react-router-dom';

const PrivateRoute = ({ component, ...rest }) => {
  const authenticated = useSelector(state => !!state.oidc.user);
  const isLoadingUser = useSelector(state => state.oidc.isLoadingUser);
  const userManager = useSelector(state => state.config.userManager);

  if (!isLoadingUser) {
    if (!authenticated) {
      userManager.signinRedirect({
        data: { path: window.location.pathname },
      }); //Go to Dex Login Form if not authenticated
    } else {
      return <Route {...rest} component={component} />;
    }
  }
};

export default PrivateRoute;
