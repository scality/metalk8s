import React, { Component } from 'react';
import { connect } from 'react-redux';
import { withRouter, Route, Redirect } from 'react-router-dom';

class PrivateRoute extends Component {
  render() {
    const { component: Component, ...rest } = this.props;
    if (this.props.authenticated) {
      return <Route {...rest} render={props => <Component {...props} />} />;
    } else {
      return <Redirect to="/login" />;
    }
  }
}

function mapStateToProps(state) {
  return {
    authenticated: !!state.login.user
  };
}

export default withRouter(connect(mapStateToProps)(PrivateRoute));
