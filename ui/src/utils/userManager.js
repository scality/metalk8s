import { createUserManager } from "redux-oidc";

const userManagerConfig = {
  client_id: "kubernetes",
  redirect_uri: "http://localhost:8000/callback",
  response_type: "id_token",
  scope: "openid profile email offline_access",
  authority: process.env.REACT_APP_OIDC_PROVIDER,
  loadUserInfo: false,
  post_logout_redirect_uri: "/"
};

const userManager = createUserManager(userManagerConfig);

export default userManager;
