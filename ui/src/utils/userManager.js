import { createUserManager } from "redux-oidc";

const userManagerConfig = {
  client_id: "kubernetes",
  redirect_uri: "http://localhost:8000/callback",
  response_type: "id_token",
  scope: "openid profile email offline_access",
  authority: "https://10.200.2.83:32000",
  loadUserInfo: false
};

const userManager = createUserManager(userManagerConfig);

export default userManager;
