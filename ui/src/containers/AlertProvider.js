//@flow
import React, { type Node } from 'react';
import { useTypedSelector } from '../hooks';
import { ErrorBoundary } from 'react-error-boundary';
import type { FilterLabels } from '../services/alertUtils';
import { ErrorPage500 } from '@scality/core-ui';
import { useTheme } from 'styled-components';
// import { FederatedComponent } from '../ModuleFederation';

export const useAlerts = (filters: FilterLabels) => {
  //return alertGlobal.hooks.useAlerts(filters);
  return {alerts: []}
};

const InternalAlertProvider = ({
  moduleExports,
  children,
}: {
  moduleExports: {},
  children: Node,
}): Node => {
  //alertGlobal.hooks = moduleExports['./alerts/alertHooks'];

  console.log(useTheme())

  return <>{children}</>

  // const alertManagerUrl = useTypedSelector(
  //   (state) => state.config.api.alertManagerUrl,
  // );
  // return (
  //   <FederatedComponent
  //     module={'./alerts/AlertProvider'}//TODO find a way to inject those values
  //     scope={'shell'}
  //     url={'http://localhost:8084/shell/remoteEntry.js'}
  //     alertManagerUrl={alertManagerUrl}
  //   >
  //     {children}
  //   </FederatedComponent>
  // );
};

function ErrorFallback() {
  const { language, api } = useTypedSelector((state) => state.config);
  const url_support = api?.url_support;
  return (
    <ErrorPage500
      data-cy="sc-error-page500"
      locale={language}
      supportLink={url_support}
    />
  );
}

const AlertProvider = ({ children }: { children: Node }): Node => {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      {/* <ComponentWithLazyHook
        componentWithInjectedHook={InternalAlertProvider}
        renderOnError={<ErrorPage500 />}
        remoteEntryUrl={'http://localhost:8084/shell/remoteEntry.js'} //TODO find a way to inject those values
        federatedModule={'./alerts/alertHooks'}
        moduleFederationScope={'shell'}
        componentProps={{ children }}
      /> */}
      <InternalAlertProvider>{children}</InternalAlertProvider>
    </ErrorBoundary>
  );
};

export default AlertProvider;
