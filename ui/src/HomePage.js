// import React, { Component } from "react";
// import "whatwg-fetch";
// import { OIDC_PROVIDER } from "./config";
// const UNSAFE_NONCE = "abcde";

// /* eslint-disable react/prefer-stateless-function */
// export default class HomePage extends Component {
//   constructor(props) {
//     super(props);
//     this.state = { linkUrl: "" };
//   }

//   componentDidMount() {
//     async function renderLoginLink() {
//       const response = await fetch(
//         OIDC_PROVIDER + "/.well-known/openid-configuration"
//       );
//       const openidConfiguration = await response.json();
//       const endpoint = openidConfiguration["authorization_endpoint"];

//       const auth = new URL(endpoint);
//       const qa = auth.searchParams;
//       qa.set("audience", "");
//       qa.set("client_id", "kubernetes");
//       qa.set("redirect_uri", "http://localhost:8000/callback");
//       qa.set("response_type", "id_token");
//       qa.set("scope", "openid profile email offline_access");
//       qa.set("nonce", UNSAFE_NONCE);
//       this.setState({ linkUrl: auth.toString() });
//     }
//     renderLoginLink.bind(this)();
//   }
//   render() {
//     return (
//       <div>
//         <a href={this.state.linkUrl}>Login</a>
//       </div>
//     );
//   }
// }

import React from "react";
import { connect } from "react-redux";
import LoginPage from "./loginPage";
import MainPage from "./mainPage";

function HomePage(props) {
  const { user } = props;

  return !user || user.expired ? <LoginPage /> : <MainPage />;
}

function mapStateToProps(state) {
  return {
    user: state.oidc.user
  };
}

function mapDispatchToProps(dispatch) {
  return {
    dispatch
  };
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(HomePage);
