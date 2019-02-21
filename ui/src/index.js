import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import "@fortawesome/fontawesome-free/css/all.css";
import App from "./App";
import { Provider } from "react-redux";
import { OidcProvider } from "redux-oidc";
import userManager from "./utils/userManager";

import { ConnectedRouter } from "connected-react-router";
import store, { history } from "./store";

ReactDOM.render(
  <Provider store={store}>
    <ConnectedRouter history={history}>
      <OidcProvider store={store} userManager={userManager}>
        <App />
      </OidcProvider>
    </ConnectedRouter>
  </Provider>,
  document.getElementById("root")
);
