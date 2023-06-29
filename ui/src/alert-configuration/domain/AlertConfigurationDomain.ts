import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';

export const SMTPAuthTypes = [
  'CRAM-MD5',
  'PLAIN',
  'LOGIN',
  'NO_AUTHENTICATION',
] as const;

export type AuthType = (typeof SMTPAuthTypes)[number];

export type CRAMMD5Credentials = {
  type: 'CRAM-MD5';
  username: string;
  secret: string;
};

export type PLAINCRedentials = {
  type: 'PLAIN';
  identity: string;
  username: string;
  password: string;
};

export type LOGINCRedentials = {
  type: 'LOGIN';
  username: string;
  password: string;
};

export type NO_AUTHENCATIONCredentials = {
  type: 'NO_AUTHENTICATION';
};

export type AlertConfiguration = {
  enabled?: boolean;
  host: string;
  port: number;
  isTLSEnabled: boolean;
  from: string;
  to: string;
  sendResolved: boolean;
} & (
  | PLAINCRedentials
  | LOGINCRedentials
  | CRAMMD5Credentials
  | NO_AUTHENCATIONCredentials
);

type Loading = 'loading';
type Success = 'success';
type Error = 'error';

export type PromiseStatus = Loading | Success | Error;

export interface PromiseSucceedResult<T> {
  status: Success;
  value: T;
}

export interface PromiseRejectedResult {
  status: Error;
  title: string;
  reason: string;
}

export interface PromiseLoadingResult {
  status: Loading;
}

export type PromiseResult<T> =
  | PromiseLoadingResult
  | PromiseSucceedResult<T>
  | PromiseRejectedResult;

export const useAlertConfiguration = ({
  alertConfigurationStore,
}: {
  alertConfigurationStore: IAlertConfigurationStore;
}): {
  alertConfiguration: PromiseResult<AlertConfiguration>;
  logs: PromiseResult<AlertStoreLogLine[]>;
} => {
  const { data, status, error } = useQuery({
    queryKey: ['alertConfiguration'],
    queryFn: () => {
      return alertConfigurationStore.getAlertConfiguration();
    },
  });

  const { data: logsData, status: logsStatus } = useQuery({
    queryKey: ['alertstorelogs'],
    queryFn: () => alertConfigurationStore.getAlertStoreLogs(),
  });

  let logs: PromiseResult<AlertStoreLogLine[]> = {
    status: 'loading',
  };

  if (logsStatus === 'error') {
    logs = {
      status: 'error',
      title: 'Failed to load AlertStore logs',
      reason: 'Failed to load AlertStore logs',
    };
  }

  if (logsStatus === 'success') {
    logs = {
      status: 'success',
      value: logsData,
    };
  }

  if (status === 'loading' || status === 'idle') {
    return { alertConfiguration: { status: 'loading' }, logs };
  }

  if (status === 'error') {
    return {
      alertConfiguration: {
        status: 'error',
        title: 'Failed to load alert configuration',
        reason: 'Failed to load alert configuration',
      },
      logs,
    };
  }

  return {
    alertConfiguration: { status: 'success', value: data },
    logs: logs,
  };
};

export type AlertStoreLogLine =
  | {
      level: 'ERROR';
      occuredOn: Date;
      message: string;
    }
  | {
      level: 'SUCCESS';
      occuredOn: Date;
    };

export interface IAlertConfigurationStore {
  getAlertConfiguration(): Promise<AlertConfiguration>;
  putAlertConfiguration(alertConfiguration: AlertConfiguration): Promise<void>;
  getTestConfiguration(): Promise<AlertConfiguration>;
  testAlertConfiguration(
    alertConfiguration: AlertConfiguration,
    configurationHasChanged: boolean,
  ): Promise<void>;
  getAlertStoreLogsForTestAlert(): Promise<AlertStoreLogLine[]>;
  getAlertStoreLogs(): Promise<AlertStoreLogLine[]>;
}

export const useEditAlertConfiguration = ({
  alertConfigurationStore,
}: {
  alertConfigurationStore: IAlertConfigurationStore;
}) => {
  const queryClient = useQueryClient();
  const editAlertMutation = useMutation({
    mutationFn: (alertConfiguration: AlertConfiguration) => {
      return alertConfigurationStore.putAlertConfiguration(alertConfiguration);
    },
    onSuccess: () => {
      queryClient.refetchQueries(['alertstorelogs']);
      queryClient.setQueryData<AlertStoreLogLine[]>(['alertstoretestlogs'], []);
    },
  });

  return { editAlertMutation };
};

export const useTestAlertConfiguration = ({
  alertConfigurationStore,
}: {
  alertConfigurationStore: IAlertConfigurationStore;
}) => {
  const [isTestInProgress, setIsTestInProgress] = useState(false);
  const queryClient = useQueryClient();
  const testDateRef = useRef<Date>(new Date());

  const { data } = useQuery({
    queryKey: ['testAlertConfiguration'],
    queryFn: () => {
      return alertConfigurationStore.getTestConfiguration();
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const sendTestAlertMutation = useMutation({
    mutationFn: (alertConfiguration: AlertConfiguration) => {
      alertConfiguration.sendResolved = false;
      return alertConfigurationStore.testAlertConfiguration(
        alertConfiguration,
        JSON.stringify(data) !== JSON.stringify(alertConfiguration),
      );
    },
    onSuccess: () => {
      testDateRef.current = new Date();
      queryClient.refetchQueries(['alertstoretestlogs']);
      queryClient.refetchQueries(['testAlertConfiguration']);
      setIsTestInProgress(true);
    },
  });

  const { data: logsData, status: logsStatus } = useQuery({
    queryKey: ['alertstoretestlogs'],
    queryFn: () => alertConfigurationStore.getAlertStoreLogsForTestAlert(),
    refetchInterval: isTestInProgress ? 1_000 : Infinity,
  });

  const hasFailedToSendTestAlert = !!logsData?.find(
    (logLine) => logLine.level === 'ERROR',
  );

  const overOneMinute = testDateRef.current < new Date(Date.now() - 60_000);
  useMemo(() => {
    if (hasFailedToSendTestAlert && isTestInProgress && overOneMinute) {
      setIsTestInProgress(false);
    }
  }, [isTestInProgress, hasFailedToSendTestAlert, overOneMinute]);

  let logs: PromiseResult<AlertStoreLogLine[]> = {
    status: 'loading',
  };
  if (logsStatus === 'error') {
    logs = {
      status: 'error',
      title: 'Unable to fetch logs',
      reason: 'Unable to fetch logs',
    };
  }

  if (logsStatus === 'success') {
    logs = {
      status: 'success',
      value: logsData,
    };
  }

  return {
    sendTestAlertMutation,
    logs,
  };
};
