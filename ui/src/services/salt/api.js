//@flow
import { User } from 'oidc-client';
import ApiClient from '../ApiClient';

let saltApiClient = null;

export function getClient() {
  return saltApiClient;
}

export function initialize(apiUrl: string) {
  saltApiClient = new ApiClient({ apiUrl });
}

export type SaltToken = {
  return: [
    {
      token: string,
      expire: number,
      start: number,
      user: string,
      eauth: string,
      perms: (string | { [key: string]: string[] })[],
    },
  ],
};

export async function authenticate(user: User): Promise<SaltToken> {
  if (!saltApiClient) {
    throw new Error('Salt api client should be defined.');
  }
  const payload = {
    eauth: 'kubernetes_rbac',
    username: `oidc:${user.profile.email}`,
    token: user.id_token,
  };
  return saltApiClient.post('/login', payload);
}

export async function deployNode(node: string, version: string) {
  if (!saltApiClient) {
    throw new Error('Salt api client should be defined.');
  }
  return saltApiClient.post('/', {
    client: 'runner_async',
    fun: 'state.orchestrate',
    arg: ['metalk8s.orchestrate.deploy_node'],
    kwarg: {
      saltenv: `metalk8s-${version}`,
      pillar: { orchestrate: { node_name: node } },
    },
  });
}

export async function printJob(jid: string) {
  if (!saltApiClient) {
    throw new Error('Salt api client should be defined.');
  }
  return saltApiClient.post('/', {
    client: 'runner',
    fun: 'jobs.print_job',
    arg: [jid],
  });
}

export async function prepareEnvironment(environment: string, version: string) {
  if (!saltApiClient) {
    throw new Error('Salt api client should be defined.');
  }
  return saltApiClient.post('/', {
    client: 'runner_async',
    fun: 'state.orchestrate',
    arg: ['metalk8s.orchestrate.solutions.prepare-environment'],
    kwarg: {
      saltenv: `metalk8s-${version}`,
      pillar: { orchestrate: { env_name: environment } },
    },
  });
}

export type IPInterfaces = {
  'metalk8s:control_plane_ip': string,
  'metalk8s:workload_plane_ip': string,
  ip_interfaces: { [interface: string]: string[] },
};
export async function getNodesIPsInterfaces(): Promise<{
  return: [{ [nodeName: string]: boolean | IPInterfaces }],
}> {
  if (!saltApiClient) {
    throw new Error('Salt api client should be defined.');
  }
  return saltApiClient.post('/', {
    client: 'local',
    tgt: '*',
    fun: 'grains.item',
    arg: [
      'metalk8s:control_plane_ip',
      'metalk8s:workload_plane_ip',
      'ip_interfaces',
    ],
  });
}
