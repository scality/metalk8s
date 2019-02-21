// import React, { Component } from "react";
// import "whatwg-fetch";
// import { JWK, JWS } from "node-jose";
// import { OIDC_PROVIDER, API_SERVER } from "./config";

// const UNSAFE_NONCE = "abcde";

// class NodeList extends Component {
//   constructor(props) {
//     super(props);
//     this.state = { nodes: null };
//   }

//   componentDidMount() {
//     async function login() {
//       const idTokenEncoded = RegExp("[#&]id_token=([^&]*)").exec(
//         window.location.hash
//       );
//       if (!idTokenEncoded) {
//         throw "Blah";
//       }
//       const idToken = decodeURIComponent(idTokenEncoded[1].replace(/\+/g, " "));

//       const response = await fetch(
//         OIDC_PROVIDER + "/.well-known/openid-configuration"
//       );
//       const openidConfiguration = await response.json();
//       const keysLocation = openidConfiguration["jwks_uri"];
//       const keysResponse = await fetch(keysLocation);
//       const keys = await keysResponse.json();
//       const keystore = await JWK.asKeyStore(keys);

//       const verifiedIdToken = await JWS.createVerify(keystore).verify(idToken);

//       const payload = JSON.parse(verifiedIdToken.payload.toString());

//       if (payload["nonce"] != UNSAFE_NONCE) {
//         throw "Nonce mismatch";
//       }
//       if (payload["iss"] != OIDC_PROVIDER) {
//         throw "Huh?!";
//       }
//       const p = document.createElement("p");
//       // Yeah yeah HTML injection blah
//       p.innerHTML = "Welcome, " + payload["name"] + "!";
//       document.body.append(p);

//       const url = API_SERVER + "/api/v1/nodes";
//       const result = await fetch(url, {
//         headers: {
//           Authorization: "Bearer " + idToken
//         }
//       });
//       const nodes = await result.json();
//       this.setState({ nodes });
//     }
//     login.bind(this)();
//   }

//   render() {
//     return (
//       <div>
//         <h1>Node list</h1>
//         <ul>
//           {this.state.nodes &&
//             this.state.nodes.items.map(node => {
//               return <li key={node.metadata.name}> {node.metadata.name} </li>;
//             })}
//         </ul>
//       </div>
//     );
//   }
// }

// export default NodeList;

import React from "react";
import { connect } from "react-redux";
import { CallbackComponent } from "redux-oidc";
import { push } from "connected-react-router";
import userManager from "./utils/userManager";

class CallbackPage extends React.Component {
  render() {
    // just redirect to '/' in both cases
    return (
      <CallbackComponent
        userManager={userManager}
        successCallback={() => this.props.dispatch(push("/"))}
        errorCallback={error => {
          this.props.dispatch(push("/"));
          console.error(error);
        }}
      >
        <div>Redirecting...</div>
      </CallbackComponent>
    );
  }
}

export default connect()(CallbackPage);
