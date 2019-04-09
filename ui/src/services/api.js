import axios from 'axios';
import { Config, Core_v1Api } from '@kubernetes/client-node';

let config, coreV1;

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

export const logout = () => {
  localStorage.removeItem('token');
};

export async function getNodes() {
  try {
    // const body = {
    //   metadata: {
    //     name: 'carlito',
    //     annotations: {
    //       'metalk8s.scality.com/ssh-user': 'vagrant',
    //       'metalk8s.scality.com/ssh-port': '22',
    //       'metalk8s.scality.com/ssh-host': '172.21.254.7',
    //       'metalk8s.scality.com/ssh-key-path':
    //         '/etc/metalk8s/pki/preshared_key_for_k8s_nodes',
    //       'metalk8s.scality.com/ssh-sudo': 'true',
    //       'metalk8s.scality.com/workload-plane': 'true',
    //       'metalk8s.scality.com/control-plane': 'true'
    //     }
    //   }
    // };
    // coreV1.createNode(body);
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
