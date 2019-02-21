import React from "react";
import userManager from "./utils/userManager";
import { Button } from "scality-ui";

class LoginPage extends React.Component {
  onLoginButtonClick(event) {
    event.preventDefault();
    userManager.signinRedirect();
  }

  render() {
    return (
      <div>
        <h3>Welcome!</h3>
        <p>Please log in to continue</p>
        <Button onClick={this.onLoginButtonClick} text="Login with Dex" />
      </div>
    );
  }
}

export default LoginPage;
