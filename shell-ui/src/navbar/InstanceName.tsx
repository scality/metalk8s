import { ErrorPage500 } from '@scality/core-ui/dist/components/error-pages/ErrorPage500.component';
import { Icon } from '@scality/core-ui/dist/components/icon/Icon.component';
import { Loader } from '@scality/core-ui/dist/components/loader/Loader.component';
import { Tooltip } from '@scality/core-ui/dist/components/tooltip/Tooltip.component';
import { ComponentWithFederatedImports } from '@scality/module-federation';
import { useQuery } from 'react-query';
import { useAuth, type UserData } from '../auth/AuthProvider';
import { useConfigRetriever, type RuntimeWebFinger } from '../initFederation/ConfigurationProviders';
import { useShellConfig } from '../initFederation/ShellConfigProvider';
import { useDeployedApps } from '../initFederation/UIListProvider';
import { EditableDeploymentName } from './EditableDeploymentName';

export const INSTANCE_NAME_QUERY_KEY = 'instanceName';

export const useInstanceName = (): string | undefined => {
  const { data } = useQuery<string>({
    queryKey: [INSTANCE_NAME_QUERY_KEY],
    enabled: false, // Don't refetch, just read from cache
  });

  return data;
};

export const useInstanceNameAdapter = () => {
  const deployedUIApps = useDeployedApps();
  const { retrieveConfiguration } = useConfigRetriever();
  const mainApp = deployedUIApps.find((app) => app.appHistoryBasePath === '');
  if (!mainApp) {
    return null;
  }
  const mainAppConfiguration = retrieveConfiguration<'build'>({
    configType: 'build',
    name: mainApp.name,
  });

  if (!mainAppConfiguration) {
    return null;
  }

  return {
    ...mainAppConfiguration.spec.instanceNameAdapter,
    remoteEntryUrl: mainApp.url + mainAppConfiguration.spec.remoteEntryPath,
  };
};

export const useInstanceNameConfiguration = () => {
  const deployedUIApps = useDeployedApps();
  const { retrieveConfiguration } = useConfigRetriever();
  const mainApp = deployedUIApps.find((app) => app.appHistoryBasePath === '');
  if (!mainApp) {
    return null;
  }
  const mainAppConfiguration = retrieveConfiguration<'build'>({
    configType: 'build',
    name: mainApp.name,
  });

  const mainAppRuntimeConfiguration = retrieveConfiguration<Record<string, unknown>>({
    configType: 'run',
    name: mainApp.name,
  });

  if (!mainAppConfiguration || !mainAppRuntimeConfiguration) {
    return null;
  }

  return {
    microAppConfiguration: mainAppConfiguration,
    runtimeAppConfiguration: mainAppRuntimeConfiguration,
  };
};

export type InstanceNameAdapter = {
  getInstanceName: (
    userData: UserData | undefined,
    configuration: RuntimeWebFinger<Record<string, unknown>>,
  ) => Promise<string>;
  setInstanceName: (
    userData: UserData | undefined,
    name: string,
    configuration: RuntimeWebFinger<Record<string, unknown>>,
  ) => Promise<void>;
  checkInstanceName: (name: string) => { hasError: true; message: string } | { hasError: false };
};

//Do not use directly - exported for testing purposes
export const _InternalInstanceName = ({
  moduleExports,
}: {
  moduleExports: {
    [moduleName: string]: {
      getInstanceName: InstanceNameAdapter['getInstanceName'];
      setInstanceName: InstanceNameAdapter['setInstanceName'];
      checkInstanceName?: InstanceNameAdapter['checkInstanceName'];
    };
  };
}) => {
  const instanceNameAdapter = useInstanceNameAdapter();
  const instanceNameConfiguration = useInstanceNameConfiguration();
  const runtimeAppConfiguration = instanceNameConfiguration?.runtimeAppConfiguration;
  const { userData } = useAuth();
  const { data, error, status } = useQuery({
    queryKey: [INSTANCE_NAME_QUERY_KEY],
    queryFn: async () =>
      moduleExports[instanceNameAdapter?.module ?? ''].getInstanceName(userData, runtimeAppConfiguration),
    enabled: !!runtimeAppConfiguration,
  });

  if (status === 'loading' || status === 'idle') {
    return (
      <Tooltip overlay="Loading deployment name" placement="bottom">
        <Loader size="smaller" />
      </Tooltip>
    );
  }

  if (status === 'error') {
    const err = error as (Error & { status?: number; code?: string }) | null | undefined;
    if (err?.status === 403 || err?.code === 'InstanceNameForbidden') {
      // User is not allowed to read the InstanceName — render nothing (no pill, no warning).
      return null;
    }
    return (
      <Tooltip overlay="Error loading deployment name" placement="bottom">
        <Icon color="statusWarning" name="Exclamation-circle" />
      </Tooltip>
    );
  }

  return (
    <EditableDeploymentName
      name={data}
      checkInstanceName={moduleExports[instanceNameAdapter?.module ?? ''].checkInstanceName}
      setInstanceName={(name) => {
        return moduleExports[instanceNameAdapter?.module ?? ''].setInstanceName(
          userData,
          name,
          runtimeAppConfiguration,
        );
      }}
    />
  );
};

export const InstanceName = () => {
  const { config } = useShellConfig();
  const instanceNameAdapter = useInstanceNameAdapter();

  if (!config.canChangeInstanceName || instanceNameAdapter === null) {
    return <></>;
  }
  return (
    <ComponentWithFederatedImports
      componentWithInjectedImports={_InternalInstanceName}
      componentProps={{}}
      renderOnError={<ErrorPage500 />}
      federatedImports={[instanceNameAdapter]}
    />
  );
};
