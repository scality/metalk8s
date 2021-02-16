import { useAuth } from 'oidc-react';
import { useLayoutEffect } from 'react';
import { AUTHENTICATED_EVENT, SolutionsNavbarProps } from './index';

export const UserDataListener = ({
  onAuthenticated,
}: {
  onAuthenticated?: $PropertyType<SolutionsNavbarProps, 'onAuthenticated'>,
}) => {
  const auth = useAuth();

  useLayoutEffect(() => {
    if (onAuthenticated) {
      onAuthenticated(
        new CustomEvent(AUTHENTICATED_EVENT, { detail: auth.userData }),
      );
    }
  }, [JSON.stringify(auth.userData), !!onAuthenticated]);
  return <></>;
};
