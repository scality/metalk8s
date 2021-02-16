//@flow
import { UserManager } from 'oidc-react';

export function logOut(userManager?: UserManager) {
  if (userManager) {
    userManager.revokeAccessToken();
    userManager.removeUser();
    location.reload();
  }
}
