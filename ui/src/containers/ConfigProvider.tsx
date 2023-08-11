import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { ComponentWithFederatedImports } from '@scality/module-federation';
import { ErrorPage500 } from '@scality/core-ui';
import { useIntl } from 'react-intl';
import { useTypedSelector } from '../hooks';
export type ConfigProps = {
  children: React.ReactNode;
};
const configGlobal = {};
export function useLinkOpener() {
  return configGlobal.hooks.useLinkOpener();
}
export function useDiscoveredViews() {
  return configGlobal.hooks.useDiscoveredViews();
}

const InternalConfigProvider = ({
  moduleExports,
  children,
}: {
  moduleExports: {};
  children: React.ReactNode;
}) => {
  configGlobal.hooks =
    moduleExports['./moduleFederation/ConfigurationProvider'];
  return <>{children}</>;
};

function ErrorFallback() {
  const intl = useIntl();
  const language = intl.locale;

  return <ErrorPage500 data-cy="sc-error-page500" locale={language} />;
}

function ConfigProvider({ children }: ConfigProps) {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <ComponentWithFederatedImports
        componentWithInjectedImports={InternalConfigProvider}
        renderOnError={<ErrorPage500 />}
        componentProps={{
          children,
        }}
        federatedImports={[
          {
            scope: 'shell',
            module: './moduleFederation/ConfigurationProvider',
            remoteEntryUrl: window.shellUIRemoteEntryUrl,
          },
        ]}
      />
    </ErrorBoundary>
  );
}

export default ConfigProvider;
