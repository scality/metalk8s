import axios from 'axios';
import { Config, Core_v1Api } from '@kubernetes/client-node';

let config, coreV1, saltAPI;

//Basic Auth
export async function authenticate(token, api_server) {
  try {
    const response = await axios.get(api_server.url + '/api/v1', {
      headers: {
        Authorization: 'Basic ' + token
      }
    });
    updateApiServerConfig(api_server.url, token);
    return response;
  } catch (error) {
    return { error };
  }
}

export const updateApiServerConfig = (url, token) => {
  config = new Config(url, token, 'Basic');
  coreV1 = config.makeApiClient(Core_v1Api);
};

export async function authenticateSaltApi(token) {
  // TODO

  try {
    // const response = await axios.get(api_server.url + '/api/v1', {
    //   headers: {
    //     Authorization: 'Basic ' + token
    //   }
    // });
    // config = new Config(api_server.url, token, 'Basic');
    // coreV1 = config.makeApiClient(Core_v1Api);

    // const url = api_server.url;
    // const token = '';

    const response = await axios.post('http://172.21.254.14:4507/login', {
      headers: {
        Authorization: 'Basic ' + token
      },
      eauth: 'kubernetes_rbac',
      username: 'admin',
      token: token,
      token_type: 'Basic'
    });

    return response;
  } catch (error) {
    return { error };
  }
  return true;
}

export async function getNodes() {
  try {
    return await coreV1.listNode();
  } catch (error) {
    return { error };
  }
}

export async function getPods() {
  try {
    return await coreV1.listPodForAllNamespaces();
  } catch (error) {
    return { error };
  }
}

export async function fetchTheme() {
  try {
    return await axios.get(process.env.PUBLIC_URL + '/brand/theme.json');
  } catch (error) {
    return { error };
  }
}

export async function fetchConfig() {
  try {
    return await axios.get(process.env.PUBLIC_URL + '/config.json');
  } catch (error) {
    return { error };
  }
}

export async function createNode(payload) {
  const body = {
    metadata: {
      name: payload.name,
      annotations: {
        'metalk8s.scality.com/ssh-user': payload.ssh_user,
        'metalk8s.scality.com/ssh-port': payload.ssh_port,
        'metalk8s.scality.com/ssh-host': payload.hostName_ip,
        'metalk8s.scality.com/ssh-key-path': payload.ssh_key_path,
        'metalk8s.scality.com/ssh-sudo': payload.sudo_required.toString(),
        'metalk8s.scality.com/workload-plane': payload.workload_plane.toString(),
        'metalk8s.scality.com/control-plane': payload.control_plane.toString()
      }
    }
  };

  try {
    return await coreV1.createNode(body);
  } catch (error) {
    return { error };
  }
}
