import { ErrorPage500 } from '@scality/core-ui/dist/components/error-pages/ErrorPage500.component';
import { ComponentWithFederatedImports } from '@scality/module-federation';
import { createContext, useContext, useState, type PropsWithChildren } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { useAuth, type UserData } from '../auth/AuthProvider';
import { useConfigRetriever, type RuntimeWebFinger } from '../initFederation/ConfigurationProviders';
import { useShellConfig } from '../initFederation/ShellConfigProvider';
import { useDeployedApps } from '../initFederation/UIListProvider';
import { EditableDeploymentName } from './EditableDeploymentName';
import { Icon } from '@scality/core-ui/dist/components/icon/Icon.component';
import { Loader } from '@scality/core-ui/dist/components/loader/Loader.component';
import { Tooltip } from '@scality/core-ui/dist/components/tooltip/Tooltip.component';
import { useToast } from '@scality/core-ui/dist/components/toast/ToastProvider';

const InstanceNameContext = createContext<{
  instanceName: string;
  setInstanceName: (name: string) => void;
} | null>(null);
export const InstanceNameProvider = ({ children }: PropsWithChildren<{}>) => {
  const [instanceName, setInstanceName] = useState('');
  return (
    <InstanceNameContext.Provider value={{ instanceName, setInstanceName }}>{children}</InstanceNameContext.Provider>
  );
};

export const useInstanceName = () => {
  const context = useContext(InstanceNameContext);
  if (!context) {
    throw new Error('useInstanceName must be used within a InstanceNameProvider');
  }
  return context.instanceName;
};

const useSetInstanceName = () => {
  const context = useContext(InstanceNameContext);
  if (!context) {
    throw new Error('useSetInstanceName must be used within a InstanceNameProvider');
  }
  return context.setInstanceName;
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

//Do not use directly - exported for testing purposes
export const _InternalInstanceName = ({
  moduleExports,
}: {
  moduleExports: {
    [moduleName: string]: {
      getInstanceName: (
        userData: UserData | undefined,
        configuration: RuntimeWebFinger<Record<string, unknown>>,
      ) => Promise<string>;
      setInstanceName: (
        userData: UserData | undefined,
        name: string,
        configuration: RuntimeWebFinger<Record<string, unknown>>,
      ) => Promise<void>;
    };
  };
}) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const instanceNameAdapter = useInstanceNameAdapter();
  const instanceNameConfiguration = useInstanceNameConfiguration();
  const runtimeAppConfiguration = instanceNameConfiguration?.runtimeAppConfiguration;
  const setInstanceName = useSetInstanceName();
  const { userData } = useAuth();
  const { data, status } = useQuery({
    queryKey: ['instanceName'],
    queryFn: async () =>
      moduleExports[instanceNameAdapter?.module ?? ''].getInstanceName(userData, runtimeAppConfiguration),
    onSuccess: (data) => {
      setInstanceName(data);
    },
    onError: (error) => {
      let errorMessage = 'An error occurred while loading the deployment name';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      showToast({
        open: true,
        status: 'error',
        message: errorMessage,
      });
    },
    enabled: !!runtimeAppConfiguration,
  });

  const mutation = useMutation({
    mutationFn: async ({ value }: { value: string }) => {
      return moduleExports[instanceNameAdapter?.module ?? ''].setInstanceName(userData, value, runtimeAppConfiguration);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['instanceName']);
    },
    onError: (error) => {
      let errorMessage = 'An error occurred while updating the deployment name';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      queryClient.invalidateQueries(['instanceName']);
      showToast({
        open: true,
        status: 'error',
        message: errorMessage,
      });
    },
  });

  if (status === 'loading' || status === 'idle') {
    return (
      <Tooltip overlay="Loading deployment name" placement="bottom">
        <Loader size="smaller" />
      </Tooltip>
    );
  }

  if (status === 'error') {
    return (
      <Tooltip overlay="Error loading deployment name" placement="bottom">
        <Icon color="statusWarning" name="Exclamation-circle" />
      </Tooltip>
    );
  }

  return (
    <EditableDeploymentName
      name={data}
      isPropagating={mutation.isLoading}
      onChange={(value) => {
        mutation.mutate({ value });
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
