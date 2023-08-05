import React, { createContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthProvider';
import { useLocation } from 'react-router';

const FirstTimeLoginContext = createContext<null | {
  firstTimeLogin: boolean | null;
}>(null);

export const useFirstTimeLogin = (): {
  firstTimeLogin: boolean | null;
} => {
  const contextValue = React.useContext(FirstTimeLoginContext);

  if (contextValue === null) {
    throw new Error(
      "Can't use useFirstTimeLogin outside FirstTimeLoginProvider",
    );
  }

  return contextValue;
};

export function FirstTimeLoginProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [firstTimeLogin, setFirstTimeLogin] = useState<boolean | null>(null);

  const { userData } = useAuth();
  const userID = userData?.id;
  const ALREADY_LOGGED_IN_USER_IDS = 'alreadyLoggedInUserIds';

  // Store the userID in the LocalStorage to maintain a record of all users who have logged in from this machine
  const ids = useMemo(
    () => localStorage.getItem(ALREADY_LOGGED_IN_USER_IDS)?.split(',') || [],
    [],
  );

  // Because of the way the OIDC library works there is a redirect to the login page, which causes the firstTimeLogin set to false when redirect to the UI.
  // So we have to check if it is in the process of signing in and if so, don't set the firstTimeLogin to false.
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isSigningIn =
    searchParams.has('code') &&
    searchParams.has('state') &&
    searchParams.has('session_state');
  useEffect(() => {
    if (isSigningIn) {
      return;
    }
    if (!ids && userID) {
      setFirstTimeLogin(true);
      localStorage.setItem(ALREADY_LOGGED_IN_USER_IDS, userID || '');
    } else if (userID && ids && !ids.includes(userID)) {
      setFirstTimeLogin(true);
      ids?.push(userID);
      localStorage.setItem(ALREADY_LOGGED_IN_USER_IDS, ids.join(','));
    } else if (userID && ids && ids.includes(userID)) {
      setFirstTimeLogin(false);
    }
  }, [userID]);

  return (
    <FirstTimeLoginContext.Provider
      value={{
        firstTimeLogin,
      }}
    >
      {children}
    </FirstTimeLoginContext.Provider>
  );
}
