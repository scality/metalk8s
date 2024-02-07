import React from 'react';
import { useIntl } from 'react-intl';
import { ErrorBoundary } from 'react-error-boundary';
import type { FilterLabels, Alert } from '../services/alertUtils';
import { ErrorPage500 } from '@scality/core-ui';
import {
  ComponentWithFederatedImports,
  FederatedComponent,
} from '@scality/module-federation';
import { STATUS_HEALTH } from '../constants';
import { useConfig } from '../FederableApp';
import { QueryObserverResult } from 'react-query';
export type Status = 'healthy' | 'warning' | 'critical';

const alertGlobal = {};
export const useAlerts = (
  filters: FilterLabels,
): Omit<QueryObserverResult<Alert[]>, 'data'> & { alerts?: Alert[] } => {
  // @ts-expect-error - FIXME when you are working on it
  return alertGlobal.hooks.useAlerts(filters);
};
export const useHighestSeverityAlerts = (filters: FilterLabels) => {
  // @ts-expect-error - FIXME when you are working on it
  return alertGlobal.hooks.useHighestSeverityAlerts(filters);
};
export const useAlertLibrary = () => {
  // @ts-expect-error - FIXME when you are working on it
  return alertGlobal.hooks;
};

export const highestAlertToStatus = (alerts?: Alert[]): Status => {
  if (!alerts || !alerts[0]?.severity) {
    return STATUS_HEALTH;
  } else {
    if (
      alerts[0].severity !== 'warning' &&
      alerts[0].severity !== 'healthy' &&
      alerts[0].severity !== 'critical'
    ) {
      throw new Error('Unknow typeof severity');
    }
    return alerts[0]?.severity;
  }
};

const InternalAlertProvider = ({
  moduleExports,
  children,
}: {
  moduleExports: {};
  children: React.ReactNode;
}) => {
  // @ts-expect-error - FIXME when you are working on it
  alertGlobal.hooks = moduleExports['./alerts/alertHooks'];

  const { url_alertmanager } = useConfig();
  return (
    <FederatedComponent
      module={'./alerts/AlertProvider'}
      scope={'shell'}
      // @ts-expect-error - FIXME when you are working on it
      url={window.shellUIRemoteEntryUrl}
      props={{
        alertManagerUrl: url_alertmanager,
        children,
      }}
    ></FederatedComponent>
  );
};

function ErrorFallback() {
  const intl = useIntl();
  const language = intl.locale;
  const { url_support } = useConfig();
  return (
    <ErrorPage500
      data-cy="sc-error-page500"
      locale={language}
      supportLink={url_support}
    />
  );
}

const AlertProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <ComponentWithFederatedImports
        componentWithInjectedImports={InternalAlertProvider}
        renderOnError={<ErrorPage500 data-cy="sc-error-page500" />}
        componentProps={{
          children,
        }}
        federatedImports={[
          {
            scope: 'shell',
            module: './alerts/alertHooks',
            // @ts-expect-error - FIXME when you are working on it
            remoteEntryUrl: window.shellUIRemoteEntryUrl,
          },
        ]}
      />
    </ErrorBoundary>
  );
};

export default AlertProvider;
