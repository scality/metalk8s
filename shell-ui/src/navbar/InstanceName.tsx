import React, {
  PropsWithChildren,
  createContext,
  useContext,
  useState,
} from 'react';
import { useShellConfig } from '../initFederation/ShellConfigProvider';
import { InlineInput } from '@scality/core-ui/dist/components/inlineinput/InlineInput';
import { useMutation, useQuery } from 'react-query';
import { useDeployedApps } from '../initFederation/UIListProvider';
import { useConfigRetriever } from '../initFederation/ConfigurationProviders';
import { ComponentWithFederatedImports } from '@scality/module-federation';
import { ErrorPage500 } from '@scality/core-ui/dist/components/error-pages/ErrorPage500.component';
import { Text } from '@scality/core-ui/dist/components/text/Text.component';
import { UserData, useAuth } from '../auth/AuthProvider';

const InstanceNameContext = createContext<{
  instanceName: string;
  setInstanceName: (name: string) => void;
} | null>(null);
export const InstanceNameProvider = ({ children }: PropsWithChildren<{}>) => {
  const [instanceName, setInstanceName] = useState('');
  return (
    <InstanceNameContext.Provider value={{ instanceName, setInstanceName }}>
      {children}
    </InstanceNameContext.Provider>
  );
};

export const useInstanceName = () => {
  const context = useContext(InstanceNameContext);
  if (!context) {
    throw new Error(
      'useInstanceName must be used within a InstanceNameProvider',
    );
  }
  return context.instanceName;
};

const useSetInstanceName = () => {
  const context = useContext(InstanceNameContext);
  if (!context) {
    throw new Error(
      'useSetInstanceName must be used within a InstanceNameProvider',
    );
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
  const mainAppConfiguration = retrieveConfiguration({
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

//Do not use directly - exported for testing purposes
export const _InternalInstanceName = ({
  moduleExports,
}: {
  moduleExports: {
    [moduleName: string]: {
      getInstanceName: (userData: UserData | undefined) => Promise<string>;
      setInstanceName: (
        userData: UserData | undefined,
        name: string,
      ) => Promise<void>;
    };
  };
}) => {
  const instanceNameAdapter = useInstanceNameAdapter();

  const setInstanceName = useSetInstanceName();
  const { userData } = useAuth();
  const { data, status } = useQuery({
    queryKey: ['instanceName'],
    queryFn: () =>
      moduleExports[instanceNameAdapter?.module ?? ''].getInstanceName(
        userData,
      ),
    onSuccess: (data) => {
      setInstanceName(data);
    },
  });

  const mutation = useMutation({
    mutationFn: ({ value }: { value: string }) => {
      return moduleExports[instanceNameAdapter?.module ?? ''].setInstanceName(
        userData,
        value,
      );
    },
  });

  return status === 'loading' ? (
    <Text>Loading...</Text>
  ) : (
    <InlineInput
      id="instanceName"
      changeMutation={mutation}
      defaultValue={data}
      confirmationModal={{
        title: <>Change instance name</>,
        body: <>Are you sure you want to change the instance name?</>,
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
