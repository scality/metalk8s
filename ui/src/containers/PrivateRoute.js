import React, { Component } from 'react';
import { connect } from 'react-redux';
import { withRouter, Route } from 'react-router-dom';

class PrivateRoute extends Component {
  state = {};
  static getDerivedStateFromProps(props) {
    if (!props.authenticated) {
      props.history.push('/login');
    }
    return null;
  }
  render() {
    const { component: Component, authenticated, ...rest } = this.props;
    if (authenticated) {
      return <Route {...rest} render={props => <Component {...props} />} />;
    }
    return null;
  }
}

function mapStateToProps(state) {
  return {
    authenticated: !!state.login.user
  };
}

export default withRouter(connect(mapStateToProps)(PrivateRoute));
