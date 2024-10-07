import { SolutionUI } from '@scality/module-federation';
import { FederatedComponent } from '@scality/module-federation';
import { Fragment, useEffect } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useAuth } from '../auth/AuthProvider';
import { useFirstTimeLogin } from '../auth/FirstTimeLoginProvider';
import type { FederatedModuleInfo } from '../initFederation/ConfigurationProviders';
import { useConfigRetriever } from '../initFederation/ConfigurationProviders';
import { useDeployedApps } from '../initFederation/UIListProvider';
import { useNotificationCenter } from '../useNotificationCenter';
import { useNavbar } from './navbarHooks';
import { useShellHistory } from '../initFederation/ShellHistoryProvider';

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
      const appBuildConfig = retrieveConfiguration<'build'>({
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
  const { firstTimeLogin } = useFirstTimeLogin();
  const { userData } = useAuth();
  const history = useShellHistory();

  useEffect(() => {
    const handleDownloadUploadEvent = (event: CustomEvent) => {
      history.push(event.detail);
    };

    window.addEventListener('downloadUploadEvent', handleDownloadUploadEvent);

    return () => {
      window.removeEventListener(
        'downloadUploadEvent',
        handleDownloadUploadEvent,
      );
    };
  }, []);

  return (
    <>
      {componentsToFederate.map((component, index) => {
        return (
          <Fragment key={index}>
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
                  isFirstTimeLogin: firstTimeLogin,
                  userData,
                }}
              />
            </ErrorBoundary>
          </Fragment>
        );
      })}
    </>
  );
};
