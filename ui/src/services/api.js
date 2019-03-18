import axios from 'axios';
import { Config, Core_v1Api } from '@kubernetes/client-node';

let config, coreV1;

const api = axios.create({
  baseURL: 'https://localhost:8080/api/v1',
  timeout: 1000
});

//Basic Auth
export async function authenticate(token) {
  localStorage.removeItem('token');
  try {
    const response = await api.get('/', {
      headers: {
        Authorization: 'Basic ' + token
      }
    });
    config = new Config('https://localhost:8080', token, 'Basic');
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
    console.error('Error retrieving nodes', error.body ? error.body : error);
  }
}
