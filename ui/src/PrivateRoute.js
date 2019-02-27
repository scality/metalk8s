import React, { Component } from "react";
import { connect } from "react-redux";
import { withRouter, Route } from "react-router-dom";
import userManager from "./utils/userManager";

class PrivateRoute extends Component {
  state = {};
  static getDerivedStateFromProps(props) {
    if (!props.isLoadingUser && !props.authenticated) {
      userManager.signinRedirect({ data: { path: window.location.pathname } }); //Go to Dex Login Form if not authenticated
    }
    return null;
  }
  render() {
    const {
      component: Component,
      authenticated,
      isLoadingUser,
      ...rest
    } = this.props;
    if (!isLoadingUser && authenticated) {
      return <Route {...rest} render={props => <Component {...props} />} />;
    }
    return null;
  }
}

function mapStateToProps(state) {
  return {
    authenticated: !!state.oidc.user,
    isLoadingUser: state.oidc.isLoadingUser
  };
}

export default withRouter(connect(mapStateToProps)(PrivateRoute));
