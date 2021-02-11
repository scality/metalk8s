import React from 'react';
import { useSelector } from 'react-redux';
import { Route } from 'react-router-dom';

const PrivateRoute = ({ component, ...rest }) => {
  const authenticated = useSelector((state) => !!state.oidc.user);

  if (!authenticated) {
    return <>You are not authenticated</>;//todo display a nicer message here
  } else {
    return <Route {...rest} component={component} />;
  }
};

export default PrivateRoute;
