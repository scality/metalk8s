//@flow
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTypedSelector } from '../hooks';
import { setThemeAction, updateAPIConfigAction, setLanguageAction } from '../ducks/config';
import { useDispatch } from 'react-redux';
import { ErrorBoundary } from 'react-error-boundary';

function useWebComponent(src?: string, customElementName: string) {
  const [hasFailed, setHasFailed] = useState(false);
  useLayoutEffect(() => {
    const body = document.body;
    // $flow-disable-line
    const element = [...(body?.querySelectorAll('script') || [])].find(
      // $flow-disable-line
      (scriptElement) => scriptElement.attributes.src?.value === src,
    );

    if (!element && body && src) {
      const scriptElement = document.createElement('script');
      scriptElement.src = src;
      scriptElement.onload = () => {
        customElements.whenDefined(customElementName).catch((e) => {
          setHasFailed(true);
        });
      };
      scriptElement.onerror = () => {
        setHasFailed(true);
      };
      body.appendChild(scriptElement);
    }
  }, [src]);

  if (hasFailed) {
    throw new Error(`Failed to load component ${customElementName}`);
  }
}

type NavbarWebComponent = HTMLElement & { logOut: () => void };

function useNavbarVersion(navbarRef: { current: NavbarWebComponent | null }): string | null {
  const [version, setVersion] = useState(null);

  useEffect(() => {
    if (!navbarRef.current) {
      return;
    }

    const navbarElement = navbarRef.current;

    const onReady = (evt: Event) => {
      // $flow-disable-line
      setVersion(evt.detail.version)
    }

    navbarElement.addEventListener(
      'ready',
      onReady,
    );

    return () => {
      navbarElement.removeEventListener(
        'ready',
        onReady,
      );
    };
  }, [navbarRef])

  return version;
}

function useLoginEffect(navbarRef: { current: NavbarWebComponent | null }, version: string | null) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const dispatch = useDispatch();

  useEffect(() => {
    if (!navbarRef.current || !version) {
      return;
    }

    const navbarElement = navbarRef.current;

    const onAuthenticated = (evt: Event) => {
      if (window.shellUINavbar[version].isAuthenticatedEvent(evt)) {
        // $flow-disable-line
        dispatch(updateAPIConfigAction(evt.detail));
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    };

    navbarElement.addEventListener(
      window.shellUINavbar[version].events.AUTHENTICATED_EVENT,
      onAuthenticated,
    );

    return () => {
      navbarElement.removeEventListener(
        window.shellUINavbar[version].events.AUTHENTICATED_EVENT,
        onAuthenticated,
      );
    };
  }, [navbarRef, version, dispatch]);

  return { isAuthenticated };
}

function useLanguageEffect(navbarRef: { current: NavbarWebComponent | null }, version: string | null) {
  const dispatch = useDispatch();

  useEffect(() => {
    if (!navbarRef.current || !version) {
      return;
    }

    const navbarElement = navbarRef.current;

    const onLanguageChanged = (evt: Event) => {
      /// flow is not accepting CustomEvent type for listener arguments of {add,remove}EventListener https://github.com/facebook/flow/issues/7179
      // $flow-disable-line
      if (evt.detail) {
        // $flow-disable-line
        dispatch(setLanguageAction(evt.detail));
      }
    };

    navbarElement.addEventListener(
      window.shellUINavbar[version].events.LANGUAGE_CHANGED_EVENT,
      onLanguageChanged,
    );

    return () => {
      navbarElement.removeEventListener(
        window.shellUINavbar[version].events.LANGUAGE_CHANGED_EVENT,
        onLanguageChanged,
      );
    };
  }, [navbarRef, version, dispatch]);
}

function useThemeEffect(navbarRef: { current: NavbarWebComponent | null }, version: string | null) {
  const dispatch = useDispatch();

  useEffect(() => {
    if (!navbarRef.current || !version) {
      return;
    }

    const navbarElement = navbarRef.current;

    const onThemeChanged = (evt: Event) => {
      /// flow is not accepting CustomEvent type for listener arguments of {add,remove}EventListener https://github.com/facebook/flow/issues/7179
      // $flow-disable-line
      if (evt.detail) {
        // $flow-disable-line
        dispatch(setThemeAction(evt.detail));
      }
    };

    navbarElement.addEventListener(
      window.shellUINavbar[version].events.THEME_CHANGED_EVENT,
      onThemeChanged,
    );

    return () => {
      navbarElement.removeEventListener(
        window.shellUINavbar[version].events.THEME_CHANGED_EVENT,
        onThemeChanged,
      );
    };
  }, [navbarRef, version, dispatch]);
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
  const navbarUrl = useTypedSelector((state) => state.config.api?.url_navbar);
  const navbarConfigUrl = useTypedSelector(
    (state) => state.config.api?.url_navbar_config,
  );
  useWebComponent(navbarUrl, 'solutions-navbar');

  const navbarRef = useRef<NavbarWebComponent | null>(null);

  const version = useNavbarVersion(navbarRef);
  console.log('version', version)
  const { isAuthenticated } = useLoginEffect(navbarRef, version);
  useLogoutEffect(navbarRef, isAuthenticated);
  useLanguageEffect(navbarRef, version);
  useThemeEffect(navbarRef, version);

  return (
    <solutions-navbar
      ref={
        // $flow-disable-line -- flow considers solutions-navbar as a row HTMLElement, TODO find if it is possible to extends JSX flow native definitions with custom element types
        navbarRef
      }
      config-url={navbarConfigUrl}
    />
  );
}
