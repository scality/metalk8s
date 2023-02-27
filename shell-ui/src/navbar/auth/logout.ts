import { UserManager } from 'oidc-react';
export function logOut(userManager?: UserManager, providerLogout?: boolean) {
  if (userManager) {
    userManager.revokeAccessToken();

    if (providerLogout) {
      userManager.signoutRedirect();
    } else {
      userManager.removeUser();
      location.reload();
    }
  }
}