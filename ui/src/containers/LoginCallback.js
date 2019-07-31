import React from 'react';
import { connect } from 'react-redux';
import { CallbackComponent } from 'redux-oidc';
import { withRouter } from 'react-router-dom';
import { updateAPIConfigAction } from '../ducks/config';

class CallbackPage extends React.Component {
  render() {
    return (
      <CallbackComponent
        userManager={this.props.userManager}
        successCallback={user => {
          this.props.updateAPIConfig(user);
          const path = (user.state && user.state.path) || '/';
          this.props.history.push(path);
        }}
        errorCallback={error => {
          this.props.history.push('/');
          console.error(error);
        }}
      >
        <div>Redirecting...</div>
      </CallbackComponent>
    );
  }
}

function mapStateToProps(state) {
  return {
    userManager: state.config.userManager
  };
}

const mapDispatchToProps = dispatch => {
  return {
    updateAPIConfig: user => dispatch(updateAPIConfigAction(user))
  };
};

export default withRouter(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )(CallbackPage)
);
