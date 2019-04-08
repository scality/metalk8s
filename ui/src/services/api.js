import axios from 'axios';
import { Config, Core_v1Api } from '@kubernetes/client-node';

let config, coreV1;

//Basic Auth
export async function authenticate(token, api_server) {
  localStorage.removeItem('token');
  try {
    const response = await axios.get(api_server.url + '/api/v1', {
      headers: {
        Authorization: 'Basic ' + token
      }
    });
    config = new Config(api_server.url, token, 'Basic');
    coreV1 = config.makeApiClient(Core_v1Api);

    return response;
  } catch (error) {
    return { error };
  }
}

export const logout = () => {
  localStorage.removeItem('token');
};

export async function getNodes() {
  try {
    return await coreV1.listNode();
  } catch (error) {
    return { error };
  }
}

export async function deleteNode(node) {
  try {
    return await coreV1.deleteNode(node);
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
