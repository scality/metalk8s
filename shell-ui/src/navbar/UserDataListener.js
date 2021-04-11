import { useAuth } from 'oidc-react';
import { useLayoutEffect } from 'react';
import { getUserGroups } from './auth/permissionUtils';
import { SolutionsNavbarProps, type UserGroupsMapping } from './index';
import { AUTHENTICATED_EVENT } from './events';

export const UserDataListener = ({
  userGroupsMapping,
  onAuthenticated,
}: {
  userGroupsMapping?: UserGroupsMapping,
  onAuthenticated?: $PropertyType<SolutionsNavbarProps, 'onAuthenticated'>,
}) => {
  const auth = useAuth();

  useLayoutEffect(() => {
    if (onAuthenticated) {
      console.log({...auth.userData, groups: getUserGroups(auth.userData, userGroupsMapping) })
      onAuthenticated(
        new CustomEvent(AUTHENTICATED_EVENT, { detail: {...auth.userData, groups: getUserGroups(auth.userData, userGroupsMapping) } }),
      );
    }
  }, [JSON.stringify(auth.userData), !!onAuthenticated]);
  return <></>;
};
