import ApiClient from '../ApiClient';

let saltApiClient = null;

export function getClient() {
  return saltApiClient;
}

export function initialize(apiUrl) {
  saltApiClient = new ApiClient({ apiUrl });
}

export function authenticate(user) {
  return saltApiClient.post('/login', {
    eauth: 'kubernetes_rbac',
    username: user.profile.email,
    token: user.id_token,
    token_type: user.token_type,
  });
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
