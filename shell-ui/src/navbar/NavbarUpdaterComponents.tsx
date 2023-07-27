import { useConfigRetriever } from '../initFederation/ConfigurationProviders';
import { useDeployedApps } from '../initFederation/UIListProvider';
import type { FederatedModuleInfo } from '../initFederation/ConfigurationProviders';
import type { SolutionUI } from '@scality/module-federation';
import { FederatedComponent } from '@scality/module-federation';
import { Fragment, useCallback, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useEffect } from 'react';
import { useNavbar } from './navbarHooks';
import { useNotificationCenter } from '../NotificationCenterProvider';

export const NavbarUpdaterComponents = () => {
  const deployedApps = useDeployedApps();
  const { retrieveConfiguration } = useConfigRetriever();
  const navbarManagementProps = useNavbar();
  const { publish, unPublish } = useNotificationCenter();
  const componentsToFederate: (FederatedModuleInfo & {
    app: SolutionUI;
    remoteEntryPath: string;
  })[] = deployedApps
    .flatMap((app) => {
      const appBuildConfig = retrieveConfiguration({
        configType: 'build',
        name: app.name,
      });
      const remoteEntryPath = appBuildConfig?.spec?.remoteEntryPath;
      return appBuildConfig?.spec?.navbarUpdaterComponents
        ? appBuildConfig?.spec?.navbarUpdaterComponents.map((component) => ({
            ...component,
            remoteEntryPath,
            app,
          }))
        : [];
    })
    .filter((appBuildConfig) => !!appBuildConfig);
  const [areMicroAppsReady, setMicroAppsAreReady] = useState(false);
  const areRemoteEntriesFileParsed = useCallback(() => {
    if (componentsToFederate.length > 0) {
      return (
        componentsToFederate
          .map((component) => {
            return window[component.scope];
          })
          .filter((scope) => !!scope).length === componentsToFederate.length &&
        window.shell
      );
    }

    return false;
  }, [componentsToFederate]);
  useEffect(() => {
    let timerId;

    const timer = () => {
      if (areRemoteEntriesFileParsed()) {
        setMicroAppsAreReady(true);
      } else {
        timerId = setTimeout(timer, 1000);
      }
    };

    timerId = setTimeout(timer, 1000);
    return () => clearTimeout(timerId);
  }, [areRemoteEntriesFileParsed, setMicroAppsAreReady]);
  return (
    <>
      {componentsToFederate.map((component, index) => {
        return (
          <Fragment key={index}>
            {!areMicroAppsReady ? (
              <></>
            ) : (
              <ErrorBoundary FallbackComponent={() => <></>}>
                <FederatedComponent
                  key={component.module}
                  url={`${component.app.url}${component.remoteEntryPath}?version=${component.app.version}`}
                  module={component.module}
                  scope={component.scope}
                  app={component.app}
                  props={{
                    navbarManagementProps,
                    publishNotification: publish,
                    unPublishNotification: unPublish,
                  }}
                />
              </ErrorBoundary>
            )}{' '}
          </Fragment>
        );
      })}
    </>
  );
};
