import React from 'react';
import { useSelector } from 'react-redux';
import { Route, Redirect } from 'react-router-dom';

const PrivateRoute = props => {
  const authenticated = useSelector(state => !!state.login.user);
  const { component, ...rest } = props;
  if (authenticated) {
    return <Route {...rest} component={component} />;
  } else {
    return <Redirect to="/login" />;
  }
};

export default PrivateRoute;
