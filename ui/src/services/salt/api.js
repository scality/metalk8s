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
    username: `oidc:${user.email}`,
    token: user.token,
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

export type IPInterfaces = {
  'metalk8s:control_plane_ip': string,
  'metalk8s:workload_plane_ip': string,
  ip_interfaces: { [interface: string]: string[] },
};

/*
We may get error message instead of IPInterfaces Object
{
  "return": [
    {
      "bootstrap": {
        "metalk8s:control_plane_ip": "10.200.6.201",
        "metalk8s:workload_plane_ip": "10.200.6.201",
        "ip_interfaces": {
          "lo": [
            "127.0.0.1",
            "::1"
          ],
          "eth0": [
            "10.200.6.201",
            "fe80::f816:3eff:fec3:b710"
          ]
        }
      },
      "nodename": "Minion did not return. [No response]\nThe minions may not have all finished running and any remaining minions will return upon completion. To look up the return data for this job later, run the following command:\n\nsalt-run jobs.lookup_jid 20210429184803777520"
    }
  ]
}
*/

export async function getNodesIPsInterfaces(
  nodeNames: string[],
): Promise<{
  return: [{ [nodeName: string]: boolean | IPInterfaces | string }],
}> {
  if (!saltApiClient) {
    throw new Error('Salt api client should be defined.');
  }
  return saltApiClient.post('/', {
    client: 'local',
    tgt: nodeNames.join(','),
    tgt_type: 'list',
    fun: 'grains.item',
    arg: [
      'metalk8s:control_plane_ip',
      'metalk8s:workload_plane_ip',
      'ip_interfaces',
    ],
  });
}
