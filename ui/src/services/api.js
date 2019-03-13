import axios from 'axios';
import { Config, Core_v1Api } from '@kubernetes/client-node';

const api = axios.create({
  baseURL: 'https://localhost:8080/api/v1',
  timeout: 1000,
  headers: {
    Authorization: 'Basic ' + localStorage.getItem('token')
  }
});
export function callApi(type, endpoint, args) {
  return api[type](endpoint, args);
}

//Basic Auth
export const authenticate = ({ username, password }) => {
  const token = btoa(username + ':' + password); //base64Encode
  localStorage.setItem('token', token);
  return Promise.resolve({
    data: {
      username,
      password,
      token
    }
  });
};

export const logout = () => {
  localStorage.clear();
};

export const getNodes = ({ token }) => {
  const config = new Config('https://localhost:8080', token, 'Basic');
  const coreV1 = config.makeApiClient(Core_v1Api);

  return coreV1
    .listNode()
    .then(nodesResponse => {
      return nodesResponse.body.items.map(node => ({
        name: node.metadata.name,
        cpu: node.status.capacity.cpu,
        memory: node.status.capacity.memory,
        pods: node.status.capacity.pods
      }));
    })
    .catch(error => {
      console.error('Error retrieving nodes', error.body ? error.body : error);
    });
};
