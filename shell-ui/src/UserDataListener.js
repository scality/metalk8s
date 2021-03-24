import { useAuth } from 'oidc-react';
import { useLayoutEffect } from 'react';
import { getUserGroups } from './auth/permissionUtils';
import { AUTHENTICATED_EVENT, SolutionsNavbarProps, type UserGroupsMapping } from './index';

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
      onAuthenticated(
        new CustomEvent(AUTHENTICATED_EVENT, { detail: {...auth.userData, groups: getUserGroups(auth.userData, userGroupsMapping) } }),
      );
    }
  }, [JSON.stringify(auth.userData), !!onAuthenticated]);
  return <></>;
};
