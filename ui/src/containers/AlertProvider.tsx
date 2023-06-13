import React from 'react';
import { useIntl } from 'react-intl';
import { useTypedSelector } from '../hooks';
import { ErrorBoundary } from 'react-error-boundary';
import type { FilterLabels, Alert } from '../services/alertUtils';
import { ErrorPage500 } from '@scality/core-ui';
import {
  ComponentWithFederatedImports,
  FederatedComponent,
} from '@scality/module-federation';
import { STATUS_HEALTH } from '../constants';
export type Status = 'healthy' | 'warning' | 'critical';

const alertGlobal = {};
export const useAlerts = (filters: FilterLabels) => {
  return alertGlobal.hooks.useAlerts(filters);
};
export const useHighestSeverityAlerts = (filters: FilterLabels) => {
  return alertGlobal.hooks.useHighestSeverityAlerts(filters);
};
export const useAlertLibrary = () => {
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
  alertGlobal.hooks = moduleExports['./alerts/alertHooks'];

  const alertManagerUrl = useTypedSelector(
    (state) => state.config.api.url_alertmanager,
  );

  return (
    <FederatedComponent
      module={'./alerts/AlertProvider'}
      scope={'shell'}
      url={window.shellUIRemoteEntryUrl}
      props={{
        alertManagerUrl,
        children,
      }}
    ></FederatedComponent>
  );
};

function ErrorFallback({ error }) {
  const intl = useIntl();
  const language = intl.locale;
  const { api } = useTypedSelector((state) => state.config);
  console.log('ErrorFallback AlertProvider', error);
  const url_support = api?.url_support;
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
        renderOnError={<ErrorPage500 />}
        componentProps={{
          children,
        }}
        federatedImports={[
          {
            scope: 'shell',
            module: './alerts/alertHooks',
            remoteEntryUrl: window.shellUIRemoteEntryUrl,
          },
        ]}
      />
    </ErrorBoundary>
  );
};

export default AlertProvider;
