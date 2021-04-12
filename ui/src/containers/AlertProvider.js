//@flow
import React, {
  type Node,
  useLayoutEffect,
  createContext,
  useContext,
  useState,
} from 'react';
import { useQuery } from 'react-query';
import { useTypedSelector } from '../hooks';
import { ErrorBoundary } from 'react-error-boundary';

export const useAlerts = (...args: any[]) => {
  const alertsVersion = useTypedSelector(
    (state) => state.config.api?.alerts_lib_version,
  );

  if (window.shellUIAlerts && window.shellUIAlerts[alertsVersion]) {
    return window.shellUIAlerts[alertsVersion].useAlerts(useContext)(...args);
  }
};

function useLibrary(src?: string) {
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
      scriptElement.onerror = () => {
        setHasFailed(true);
      };
      body.appendChild(scriptElement);
    }
  }, [src]);

  if (hasFailed) {
    throw new Error(`Failed to load library ${src || ''}`);
  }
}

const InternalAlertProvider = ({ children }: { children: Node }): Node => {
  const alertsUrl = useTypedSelector((state) => state.config.api?.url_alerts);
  const alertsVersion = useTypedSelector(
    (state) => state.config.api?.alerts_lib_version,
  );
  const alertManagerUrl = useTypedSelector(
    (state) => state.config.api?.url_alertmanager,
  );

  useLibrary(alertsUrl);

  if (window.shellUIAlerts && window.shellUIAlerts[alertsVersion]) {
    const AlertProvider = window.shellUIAlerts[alertsVersion].AlertProvider(createContext, useQuery);

    return (
      <AlertProvider alertManagerUrl={alertManagerUrl}>
        {children}
      </AlertProvider>
    );
  }

  return <>{children}</>;
};

function ErrorFallback({ error, resetErrorBoundary }) {
  //Todo redirect to a beautiful error page
  return (
    <div role="alert">
      <p>Something went wrong:</p>
      <pre>{error.message}</pre>
    </div>
  );
}

const AlertProvider = ({ children }: { children: Node }): Node => {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <InternalAlertProvider>{children}</InternalAlertProvider>
    </ErrorBoundary>
  );
};

export default AlertProvider;
