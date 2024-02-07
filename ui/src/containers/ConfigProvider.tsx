import { ErrorPage500 } from '@scality/core-ui';
import { ComponentWithFederatedImports } from '@scality/module-federation';
import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useIntl } from 'react-intl';
export type ConfigProps = {
  children: React.ReactNode;
};
const configGlobal = {};
export function useLinkOpener() {
  // @ts-expect-error - FIXME when you are working on it
  return configGlobal.hooks.useLinkOpener();
}
export function useDiscoveredViews() {
  // @ts-expect-error - FIXME when you are working on it
  return configGlobal.hooks.useDiscoveredViews();
}

const InternalConfigProvider = ({
  moduleExports,
  children,
}: {
  moduleExports: {};
  children: React.ReactNode;
}) => {
  // @ts-expect-error - FIXME when you are working on it
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
        renderOnError={<ErrorPage500 data-cy="sc-error-page500" />}
        componentProps={{
          children,
        }}
        federatedImports={[
          {
            scope: 'shell',
            module: './moduleFederation/ConfigurationProvider',
            // @ts-expect-error - FIXME when you are working on it
            remoteEntryUrl: window.shellUIRemoteEntryUrl,
          },
        ]}
      />
    </ErrorBoundary>
  );
}

export default ConfigProvider;
