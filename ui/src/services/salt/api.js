import ApiClient from '../ApiClient';

let saltApiClient = null;

export function getClient() {
  return saltApiClient;
}

export function initialize(apiUrl) {
  saltApiClient = new ApiClient({ apiUrl });
}

export type SaltToken = {
  "return": [
    {
      "token": string,
      "expire": number,
      "start": number,
      "user": string,
      "eauth": string,
      "perms": (string | {[key: string]: string[]})[]
    }
  ]
}

export function authenticate(user): Promise<SaltToken> {
  var payload = {
    eauth: 'kubernetes_rbac',
    username: user.profile.email,
    token: user.id_token,
  };
  return saltApiClient.post('/login', payload);
}

export async function deployNode(node, version) {
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

export async function printJob(jid) {
  return saltApiClient.post('/', {
    client: 'runner',
    fun: 'jobs.print_job',
    arg: [jid],
  });
}

export async function prepareEnvironment(environment, version) {
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

export async function getNodesIPsInterfaces() {
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
