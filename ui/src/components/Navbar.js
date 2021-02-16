//@flow
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTypedSelector } from '../hooks';
import { updateAPIConfigAction } from '../ducks/config';
import { useDispatch } from 'react-redux';
import { ErrorBoundary } from 'react-error-boundary';

function useWebComponent(src: string, customElementName: string) {
  const [hasFailed, setHasFailed] = useState(false);
  useLayoutEffect(() => {
    const body = document.body;
    // $flow-disable-line
    const element = [...(body?.querySelectorAll('script') || [])].find(
      // $flow-disable-line
      (scriptElement) => scriptElement.attributes.src?.value === src,
    );

    if (!element && body) {
      const scriptElement = document.createElement('script');
      scriptElement.src = src;
      scriptElement.onload = () => {
        customElements.whenDefined(customElementName).catch(e => {
          setHasFailed(true);
        })
      }
      scriptElement.onerror = () => {
        setHasFailed(true);
      }
      body.appendChild(scriptElement);
    }
  }, [src]);

  if (hasFailed) {
    throw new Error(`Failed to load component ${customElementName}`);
  }
}

type NavbarWebComponent = HTMLElement & { logOut: () => void };

function useLoginEffect(navbarRef: { current: NavbarWebComponent | null }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const dispatch = useDispatch();

  useEffect(() => {
    if (!navbarRef.current) {
      return;
    }

    const navbarElement = navbarRef.current;

    const onAuthenticated = (evt: Event) => {
      /// flow is not accepting CustomEvent type for listener arguments of {add,remove}EventListener https://github.com/facebook/flow/issues/7179
      // $flow-disable-line
      if (evt.detail) {
        // $flow-disable-line
        dispatch(updateAPIConfigAction(evt.detail));
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    };

    navbarElement.addEventListener(
      'solutions-navbar--authenticated',
      onAuthenticated,
    );

    return () => {
      navbarElement.removeEventListener(
        'solutions-navbar--authenticated',
        onAuthenticated,
      );
    };
  }, [navbarRef, dispatch]);

  return { isAuthenticated };
}

function useLogoutEffect(
  navbarRef: { current: NavbarWebComponent | null },
  isAuthenticated: boolean,
) {
  const user = useTypedSelector((state) => state.oidc?.user);
  useLayoutEffect(() => {
    if (!navbarRef.current) {
      return;
    }

    if (isAuthenticated && !user) {
      navbarRef.current.logOut();
    }
  }, [navbarRef, !user, isAuthenticated]);
}

function ErrorFallback({ error, resetErrorBoundary }) {
  //Todo redirect to a beautiful error page
  return (
    <div role="alert">
      <p>Something went wrong:</p>
      <pre>{error.message}</pre>
    </div>
  );
}

export function Navbar() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <InternalNavbar />
    </ErrorBoundary>
  );
}

function InternalNavbar() {
  useWebComponent('/shell/solution-ui-navbar.1.0.0.js', 'solutions-navbar');

  const navbarRef = useRef<NavbarWebComponent | null>(null);

  const { isAuthenticated } = useLoginEffect(navbarRef);
  useLogoutEffect(navbarRef, isAuthenticated);

  //TODO call updateLanguage() when language changed

  return (
    <solutions-navbar
      ref={
        // $flow-disable-line -- flow considers solutions-navbar as a row HTMLElement, TODO find if it is possible to extends JSX flow native definitions with custom element types
        navbarRef
      }
    />
  );
}
