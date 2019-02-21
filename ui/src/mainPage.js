import React from "react";
import { connect } from "react-redux";

class MainPage extends React.Component {
  render() {
    return <div>{this.props.user.name}</div>;
  }
}

function mapStateToProps(state) {
  return {
    user: state.oidc.user.profile
  };
}

export default connect(mapStateToProps)(MainPage);
