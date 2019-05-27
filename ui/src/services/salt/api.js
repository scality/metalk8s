import axios from 'axios';

export async function authenticate(url, user) {
  try {
    return await axios.post(url + '/login', {
      eauth: 'kubernetes_rbac',
      username: user.username,
      token: user.token,
      token_type: 'Basic'
    });
  } catch (error) {
    return { error };
  }
}

export async function deployNode(url, token, node, version) {
  try {
    return await axios.post(
      url,
      {
        client: 'runner_async',
        fun: 'state.orchestrate',
        arg: ['metalk8s.orchestrate.deploy_node'],
        kwarg: {
          saltenv: `metalk8s-${version}`,
          pillar: { orchestrate: { node_name: node } }
        }
      },
      {
        headers: { 'X-Auth-Token': token }
      }
    );
  } catch (error) {
    return { error };
  }
}

export async function printJob(url, token, jid) {
  try {
    return await axios.post(
      url,
      {
        client: 'runner',
        fun: 'jobs.print_job',
        arg: [jid]
      },
      {
        headers: { 'X-Auth-Token': token }
      }
    );
  } catch (error) {
    return { error };
  }
}
