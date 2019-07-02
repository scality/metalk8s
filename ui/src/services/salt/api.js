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
    username: user.username,
    token: user.token,
    token_type: 'Basic'
  });
}

export async function deployNode(node, version) {
  return saltApiClient.post('/', {
    client: 'runner_async',
    fun: 'state.orchestrate',
    arg: ['metalk8s.orchestrate.deploy_node'],
    kwarg: {
      saltenv: `metalk8s-${version}`,
      pillar: { orchestrate: { node_name: node } }
    }
  });
}

export async function printJob(jid) {
  return saltApiClient.post('/', {
    client: 'runner',
    fun: 'jobs.print_job',
    arg: [jid]
  });
}
