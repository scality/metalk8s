//@flow
import React, {
  type Node,
  useLayoutEffect,
  createContext,
  useContext,
  useState,
  useRef,
} from 'react';
import { useQuery } from 'react-query';
import { useTypedSelector } from '../hooks';
import { ErrorBoundary } from 'react-error-boundary';
import type { FilterLabels } from '../services/alertUtils';
import { ErrorPage500 } from '@scality/core-ui';

export const useAlerts = (filters: FilterLabels) => {
  const alertsVersion = useTypedSelector(
    (state) => state.config.api?.alerts_lib_version,
  );

  if (window.shellUIAlerts && window.shellUIAlerts[alertsVersion]) {
    return window.shellUIAlerts[alertsVersion].useAlerts(useContext)(filters);
  }
};

/**
 * This hook dynamically load Alert library.
 *
 * It first creates a script entry if none exists referring the given library src
 *  and then initiates the library by calling `createAlertContext`
 *
 * @param {string} src library bundle url
 * @param {string?} version library version
 */
function useAlertLibrary(src?: string, version?: string) {
  const [hasFailed, setHasFailed] = useState(false);
  useLayoutEffect(() => {
    const body = document.body;
    // $flow-disable-line
    const element = [...(body?.querySelectorAll('script') || [])].find(
      // $flow-disable-line
      (scriptElement) => scriptElement.attributes.src?.value === src,
    );

    if (!element && body && src && version) {
      const scriptElement = document.createElement('script');
      scriptElement.src = src;
      scriptElement.onerror = () => {
        setHasFailed(true);
      };
      scriptElement.onload = () => {
        window.shellUIAlerts[version].createAlertContext(createContext)
      }
      body.appendChild(scriptElement);
    }
  }, [src, version]);

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

  useAlertLibrary(alertsUrl, alertsVersion);

  const AlertProviderRef = useRef(null);

  // In order to avoid react to uselessly rerender children every time we move
  // the AlertProvider to a ref and renders it only a single time once the library is ready.
  if (window.shellUIAlerts && window.shellUIAlerts[alertsVersion] && !AlertProviderRef.current) {
    AlertProviderRef.current = window.shellUIAlerts[alertsVersion].AlertProvider(useQuery);
  }

  if (AlertProviderRef.current) {
    return (
      <AlertProviderRef.current alertManagerUrl={alertManagerUrl}>
        {children}
      </AlertProviderRef.current>
    );
  }

  return <>{children}</>;
};

function ErrorFallback() {
  const { language, api } = useTypedSelector((state) => state.config);
  const url_support = api?.url_support;
  return <ErrorPage500 data-cy='sc-error-page500' locale={ language } supportLink={ url_support }/>;
}

const AlertProvider = ({ children }: { children: Node }): Node => {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <InternalAlertProvider>{children}</InternalAlertProvider>
    </ErrorBoundary>
  );
};

export default AlertProvider;
