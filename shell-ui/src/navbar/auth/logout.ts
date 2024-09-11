import { UserManager } from 'oidc-react';
export function logOut(userManager?: UserManager, providerLogout?: boolean) {
  if (userManager) {
    userManager.revokeTokens();

    if (providerLogout) {
      userManager.signoutRedirect();
    } else {
      userManager.removeUser();
      location.reload();
    }
  }
}
