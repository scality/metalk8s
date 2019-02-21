import React from "react";
import { connect } from "react-redux";
import LoginPage from "./Login";
import NodeList from "./NodeList";

function HomePage(props) {
  const { user } = props;

  return !user || user.expired ? <LoginPage /> : <NodeList />;
}

function mapStateToProps(state) {
  return {
    user: state.oidc.user
  };
}

export default connect(mapStateToProps)(HomePage);
