import axios from 'axios';
import { Config, Core_v1Api } from '@kubernetes/client-node';

let config, coreV1;

//Basic Auth
export async function authenticate(token, api_server) {
  localStorage.removeItem('token');
  try {
    const url = 'https://' + api_server.ip + ':' + api_server.port;
    const response = await axios.get(url + '/api/v1', {
      headers: {
        Authorization: 'Basic ' + token
      }
    });
    config = new Config(url, token, 'Basic');
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
