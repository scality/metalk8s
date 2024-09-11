import { AlertManagerConfig, Receiver, Route } from './AlertManagerTypes';
import {
  AlertConfiguration,
  AlertStoreLogLine,
  IAlertConfigurationStore,
} from '../domain/AlertConfigurationDomain';
import YAML from 'yaml';
import { V1ConfigMap, V1NodeList } from '@kubernetes/client-node';
import { getTokenType } from '../../services/platformlibrary/k8s';

type AlertmanagerConfigKind = 'AlertmanagerConfig';

type Metalk8sCSCConfiguration<
  KIND extends string,
  T extends Record<string, unknown>,
> = {
  apiVersion: 'addons.metalk8s.scality.com';
  kind: KIND;
  spec: T;
};

type Metalk8sAlertManagerConfig = Metalk8sCSCConfiguration<
  AlertmanagerConfigKind,
  {
    notification?: {
      config?: AlertManagerConfig;
    };
  }
>;

const parseHostAndPort = (hostAndPort: string) => {
  const [host, port] = hostAndPort.split(':');
  return { host, port: port ? parseInt(port, 10) : 25 };
};

export type SaltLoginResponse =
  | {
      return: [
        {
          token: string;
          expire: number;
          start: number;
          user: string;
          eauth: string;
          perms: (string | Record<string, string[]>)[];
        },
      ];
    }
  | {
      error: string;
    };

export class Metalk8sCSCAlertConfigurationStore
  implements IAlertConfigurationStore
{
  constructor(
    private k8sApiBaseUrl: string,
    private saltApiBaseUrl: string,
    private alertManagerApiBaseUrl: string,
    private getToken: getTokenType,
    private email: string,
  ) {}

  getTestConfiguration() {
    return this._getAlertConfiguration(true);
  }

  async _getAlertManagerConfig() {
    const configMapResponse = await fetch(
      `${this.k8sApiBaseUrl}/api/v1/namespaces/metalk8s-monitoring/configmaps/metalk8s-alertmanager-config`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await this.getToken()}`,
        },
      },
    );

    if (configMapResponse.status !== 200) {
      throw new Error('Error getting configmap');
    }

    const configMap: V1ConfigMap = await configMapResponse.json();
    const rawAlertManagerConfig = configMap.data?.['config.yaml'] || '';

    const alertManagerConfig: Metalk8sAlertManagerConfig = YAML.parse(
      rawAlertManagerConfig,
    );
    return alertManagerConfig;
  }

  async _applyConfigMapChangesAndCallSalt(
    newConfig: Metalk8sAlertManagerConfig,
  ) {
    await fetch(
      `${this.k8sApiBaseUrl}/api/v1/namespaces/metalk8s-monitoring/configmaps/metalk8s-alertmanager-config`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/merge-patch+json',
          Authorization: `Bearer ${await this.getToken()}`,
        },
        body: JSON.stringify({
          data: {
            ['config.yaml']: YAML.stringify(newConfig),
          },
        }),
      },
    );

    //Login salt api
    const saltLoginFetchResponse = await fetch(`${this.saltApiBaseUrl}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eauth: 'kubernetes_rbac',
        username: `oidc:${this.email}`,
        token: await this.getToken(),
      }),
    });

    if (saltLoginFetchResponse.status !== 200) {
      throw new Error('Error login with salt api');
    }

    const saltLoginResponse: SaltLoginResponse =
      await saltLoginFetchResponse.json();

    if ('error' in saltLoginResponse) {
      throw new Error('Error login with salt api');
    }

    const nodesFetchResponse = await fetch(
      `${this.k8sApiBaseUrl}/api/v1/nodes`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await this.getToken()}`,
        },
      },
    );

    if (nodesFetchResponse.status !== 200) {
      throw new Error('Error fetching nodes information');
    }

    const nodesResponse: V1NodeList = await nodesFetchResponse.json();
    const metalk8sVersion =
      nodesResponse.items[0].metadata?.labels?.[
        'metalk8s.scality.com/version'
      ] || null;

    if (!metalk8sVersion) {
      throw new Error('Error fetching metalk8s version');
    }

    await fetch(`${this.saltApiBaseUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': saltLoginResponse.return[0].token,
      },
      body: JSON.stringify({
        client: 'runner',
        fun: 'state.orchestrate',
        arg: ['metalk8s.addons.prometheus-operator.deployed'],
        kwarg: {
          saltenv: `metalk8s-${metalk8sVersion}`,
          pillar: {},
        },
      }),
    });
  }

  async _getAlertConfiguration(
    selectTestConfig: boolean,
  ): Promise<AlertConfiguration> {
    const alertManagerConfig: Metalk8sAlertManagerConfig =
      await this._getAlertManagerConfig();

    const currentEmailreceiver: Receiver =
      alertManagerConfig.spec.notification?.config?.receivers?.find(
        (receiver) => {
          return (
            receiver.email_configs &&
            receiver.email_configs.length > 0 &&
            (selectTestConfig
              ? receiver.name === 'test-receiver-config-from-ui'
              : receiver.name !== 'test-receiver-config-from-ui')
          );
        },
      ) || {
        name: selectTestConfig ? 'test-receiver-config-from-ui' : 'default',
      };

    const receiverName = currentEmailreceiver.name;
    const isEnable =
      alertManagerConfig.spec.notification?.config?.route?.routes?.find(
        (r) => r.receiver === receiverName,
      );

    const smtpHostAndPort = parseHostAndPort(
      currentEmailreceiver?.email_configs?.[0].smarthost ||
        alertManagerConfig.spec.notification?.config?.global?.smtp_smarthost ||
        '',
    );

    const alertConfiguration: Omit<
      AlertConfiguration,
      'type' | 'username' | 'password' | 'secret' | 'identity'
    > = {
      enabled: !!isEnable,
      host: smtpHostAndPort.host,
      port: smtpHostAndPort.port,
      isTLSEnabled: !!(
        currentEmailreceiver?.email_configs?.[0].require_tls === true ||
        (currentEmailreceiver?.email_configs?.[0].require_tls !== false &&
          alertManagerConfig.spec.notification?.config?.global
            ?.smtp_require_tls)
      ),
      from:
        currentEmailreceiver?.email_configs?.[0].from ||
        alertManagerConfig.spec.notification?.config?.global?.smtp_from ||
        '',
      to: currentEmailreceiver?.email_configs?.[0].to || '',
      sendResolved:
        currentEmailreceiver?.email_configs?.[0].send_resolved === true,
    };

    const username =
      currentEmailreceiver?.email_configs?.[0].auth_username ||
      alertManagerConfig.spec.notification?.config?.global?.smtp_auth_username;
    const password =
      currentEmailreceiver?.email_configs?.[0].auth_password ||
      alertManagerConfig.spec.notification?.config?.global?.smtp_auth_password;
    const identity =
      currentEmailreceiver?.email_configs?.[0].auth_identity ||
      alertManagerConfig.spec.notification?.config?.global?.smtp_auth_identity;
    const secret =
      currentEmailreceiver?.email_configs?.[0].auth_secret ||
      alertManagerConfig.spec.notification?.config?.global?.smtp_auth_secret;

    if (username && password && identity) {
      return {
        ...alertConfiguration,
        type: 'PLAIN',
        username,
        password,
        identity,
      };
    }

    if (username && secret) {
      return {
        ...alertConfiguration,
        type: 'CRAM-MD5',
        username,
        secret,
      };
    }

    if (username && password) {
      return {
        ...alertConfiguration,
        type: 'LOGIN',
        username,
        password,
      };
    }

    return {
      ...alertConfiguration,
      type: 'NO_AUTHENTICATION',
    };
  }

  async getAlertConfiguration() {
    return this._getAlertConfiguration(false);
  }

  async _convertAndMergeEmailReceiver(
    alertConfiguration: AlertConfiguration,
    currentEmailreceiver: Receiver,
  ): Promise<Receiver> {
    const html = await fetch(`/brand/email.html`).then((res) => res.text());

    return {
      ...currentEmailreceiver,
      email_configs: [
        {
          smarthost: `${alertConfiguration.host}:${alertConfiguration.port}`,
          require_tls: alertConfiguration.isTLSEnabled,
          from: alertConfiguration.from,
          to: alertConfiguration.to,
          send_resolved: alertConfiguration.sendResolved,
          html,
          ...(alertConfiguration.isTLSEnabled
            ? {
                tls_config: {
                  insecure_skip_verify: true,
                },
              }
            : {}),

          ...(alertConfiguration.type === 'CRAM-MD5'
            ? {
                auth_username: alertConfiguration.username,
                auth_secret: alertConfiguration.secret,
              }
            : alertConfiguration.type === 'LOGIN'
            ? {
                auth_username: alertConfiguration.username,
                auth_password: alertConfiguration.password,
              }
            : alertConfiguration.type === 'PLAIN'
            ? {
                auth_identity: alertConfiguration.identity,
                auth_username: alertConfiguration.username,
                auth_password: alertConfiguration.password,
              }
            : {}),
        },
        ...(currentEmailreceiver.email_configs?.slice(1) || []),
      ],
    };
  }

  async putAlertConfiguration(alertConfiguration: AlertConfiguration) {
    const alertManagerConfig: Metalk8sAlertManagerConfig =
      await this._getAlertManagerConfig();

    const currentEmailreceiver: Receiver =
      alertManagerConfig.spec.notification?.config?.receivers?.find(
        (receiver) => {
          return (
            receiver.email_configs &&
            receiver.email_configs.length > 0 &&
            receiver.name !== 'test-receiver-config-from-ui'
          );
        },
      ) || { name: 'default' };

    const receiverWithoutTest =
      alertManagerConfig.spec.notification?.config?.receivers?.filter(
        (r) => r.name !== 'test-receiver-config-from-ui',
      ) || [];
    const emailReceiverIndexToPatch =
      receiverWithoutTest.findIndex(
        (receiver) =>
          receiver.email_configs && receiver.email_configs.length > 0,
      ) || 0;

    const newEmailReceiver: Receiver = await this._convertAndMergeEmailReceiver(
      alertConfiguration,
      currentEmailreceiver,
    );

    const newDefaultReceiverRoute: Route = {
      group_by: ['...'],
      matchers: ['severity !~ "info|none"'],
      receiver: currentEmailreceiver.name,
      continue: true,
    };

    const routesWithoutTest =
      alertManagerConfig.spec.notification?.config?.route?.routes?.filter(
        (r) => r.receiver !== 'test-receiver-config-from-ui',
      ) ?? [];

    const defaultReceiverRouteIndex =
      routesWithoutTest.findIndex(
        (route) => route.receiver === currentEmailreceiver.name,
      ) || 0;

    const routes = alertConfiguration.enabled
      ? [
          ...(routesWithoutTest?.slice(0, defaultReceiverRouteIndex) || []),
          newDefaultReceiverRoute,
          ...(routesWithoutTest?.slice(defaultReceiverRouteIndex + 1) || []),
        ]
      : routesWithoutTest?.filter(
          (r) => r.receiver !== currentEmailreceiver.name,
        );

    const newConfig: Metalk8sAlertManagerConfig = {
      ...alertManagerConfig,
      spec: {
        ...alertManagerConfig.spec,
        notification: {
          ...alertManagerConfig.spec.notification,
          config: {
            ...alertManagerConfig.spec.notification?.config,
            route: {
              ...alertManagerConfig.spec.notification?.config?.route,
              routes: routes,
            },
            receivers: [
              ...(receiverWithoutTest?.slice(0, emailReceiverIndexToPatch) ||
                []),
              newEmailReceiver,
              ...(receiverWithoutTest?.slice(emailReceiverIndexToPatch + 1) ||
                []),
            ],
          },
        },
      },
    };

    await this._applyConfigMapChangesAndCallSalt(newConfig);
  }

  async testAlertConfiguration(
    alertConfiguration: AlertConfiguration,
    configurationHasChanged: boolean,
  ) {
    if (configurationHasChanged) {
      // Edit configmap
      const alertManagerConfig: Metalk8sAlertManagerConfig =
        await this._getAlertManagerConfig();

      const testReceiverName = 'test-receiver-config-from-ui';

      const emptyReceiver: Receiver = {
        name: testReceiverName,
      };
      const newEmailReceiver: Receiver =
        await this._convertAndMergeEmailReceiver(
          alertConfiguration,
          emptyReceiver,
        );

      delete newEmailReceiver.email_configs?.[0].send_resolved;

      const newTestReceiverRoute: Route = {
        group_by: ['...'],
        group_wait: '1s',
        group_interval: '1s',
        matchers: ['alertname = "dummy_alert"'],
        receiver: testReceiverName,
      };

      const newConfig: Metalk8sAlertManagerConfig = {
        ...alertManagerConfig,
        spec: {
          ...alertManagerConfig.spec,
          notification: {
            ...alertManagerConfig.spec.notification,
            config: {
              ...alertManagerConfig.spec.notification?.config,
              route: {
                ...alertManagerConfig.spec.notification?.config?.route,
                routes: [
                  newTestReceiverRoute,
                  ...(alertManagerConfig.spec.notification?.config?.route?.routes?.filter(
                    (r) => r.receiver !== testReceiverName,
                  ) || []),
                ],
              },
              receivers: [
                ...(alertManagerConfig.spec.notification?.config?.receivers?.filter(
                  (r) => r.name !== testReceiverName,
                ) || []),
                newEmailReceiver,
              ],
            },
          },
        },
      };

      const date = new Date();

      await this._applyConfigMapChangesAndCallSalt(newConfig);

      // We need to wait that alert manager pods is ready to receive alert

      const fetchAlertManagerPods = async (): Promise<void> => {
        const podsResponse = await fetch(
          `${this.k8sApiBaseUrl}/api/v1/namespaces/metalk8s-monitoring/pods`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${await this.getToken()}`,
            },
          },
        );

        if (podsResponse.status !== 200) {
          return;
        }

        const pods: V1NodeList = await podsResponse.json();

        const alertManagerPods = pods.items.filter((pod) => {
          return pod.metadata?.name?.includes(
            'alertmanager-prometheus-operator-alertmanager',
          );
        });

        // compare each pods metadata creation timestamp with the date and  check if they status is ready

        const podsReady = alertManagerPods.every((pod) => {
          const podCreationDate = new Date(
            pod.metadata?.creationTimestamp || '',
          );

          return (
            pod.status?.conditions?.findIndex(
              (condition) =>
                condition.type === 'Ready' && condition.status === 'True',
            ) !== -1 && podCreationDate.getTime() > date.getTime()
          );
        });

        if (!podsReady) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return fetchAlertManagerPods();
        }
      };

      await fetchAlertManagerPods();
    }
    // Send dummy alert
    const alertConfWithoutCreds: AlertConfiguration = { ...alertConfiguration };
    let credsTemplate = '';

    if (
      alertConfWithoutCreds.type === 'LOGIN' ||
      alertConfWithoutCreds.type === 'PLAIN' ||
      alertConfWithoutCreds.type === 'CRAM-MD5'
    ) {
      credsTemplate = `Username(${alertConfWithoutCreds.username})`;
    }

    if (alertConfWithoutCreds.type === 'PLAIN') {
      credsTemplate = `${credsTemplate}, Identity(${alertConfWithoutCreds.identity})`;
    }

    const descriptionTemplate = `
    Host(${alertConfWithoutCreds.host}), 
    Port(${alertConfWithoutCreds.port}), 
    TLS(${alertConfWithoutCreds.isTLSEnabled ? 'enabled' : 'disabled'}), 
    From(${alertConfWithoutCreds.from}), 
    To(${alertConfWithoutCreds.to}), 
    Send resolved(${
      alertConfWithoutCreds.sendResolved ? 'enabled' : 'disabled'
    })
    ${credsTemplate}.`;

    const alertFetchResponse = await fetch(
      `${this.alertManagerApiBaseUrl}/api/v2/alerts`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          {
            labels: {
              alertname: 'dummy_alert',
              severity: 'critical',
              testedOn: new Date().toISOString(),
            },
            annotations: {
              description: descriptionTemplate,
            },
          },
        ]),
      },
    );

    if (alertFetchResponse.status !== 200) {
      throw new Error(`Error while sending test alert`);
    }

    const alertResponse = await alertFetchResponse.json();
    if (alertResponse.status !== 'success') {
      throw new Error(
        `Error while sending test alert : ${alertResponse.error.message}`,
      );
    }
  }

  async _fetchAlertStoreLogs(receiverName: string) {
    const logsResponse = await fetch(
      `${this.k8sApiBaseUrl}/api/v1/namespaces/metalk8s-monitoring/pods/alertmanager-prometheus-operator-alertmanager-0/log?container=alertmanager`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${await this.getToken()}`,
        },
      },
    );

    if (logsResponse.status !== 200) {
      throw new Error('Error getting logs');
    }

    const logs = await logsResponse.text();

    const lines: AlertStoreLogLine[] = logs.split('\n').flatMap((line) => {
      if (
        (line.includes('level=warn') || line.includes('level=error')) &&
        (line.includes(`receiver=${receiverName}`) ||
          line.includes(`receiver="${receiverName}`) ||
          line.includes(`err="${receiverName}`))
      ) {
        const components = line.match(
          /(?<key>\w+)=("(?<value1>(\\"|[^"])+)"|(?<value2>[^ ]*))/g,
        );

        const obj = components?.reduce((acc, component) => {
          let [key, value] = component.split('=');

          value = value.replace(/"/g, '');

          return {
            ...acc,
            [key]: value,
          };
        }, {} as { err: string; ts: string });

        if (!obj) {
          return [];
        }

        return [
          {
            level: 'ERROR',
            message: obj.err,
            occuredOn: new Date(obj.ts),
          },
        ];
      }

      return [];
    });

    return lines.reverse();
  }

  async getAlertStoreLogsForTestAlert() {
    return this._fetchAlertStoreLogs('test-receiver-config-from-ui');
  }

  async getAlertStoreLogs() {
    return this._fetchAlertStoreLogs('default');
  }
}
