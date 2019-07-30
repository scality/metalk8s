import React from 'react';
import { connect } from 'react-redux';
import { CallbackComponent } from 'redux-oidc';
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

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(CallbackPage);
