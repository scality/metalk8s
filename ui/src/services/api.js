import axios from 'axios';
import { Config, Core_v1Api } from '@kubernetes/client-node';

const api = axios.create({
  baseURL: 'https://localhost:8080/api/v1',
  timeout: 1000
});

//Basic Auth
export const authenticate = ({ username, password }) => {
  localStorage.removeItem('token');
  const token = btoa(username + ':' + password); //base64Encode
  return api
    .get('/', {
      headers: {
        Authorization: 'Basic ' + token
      }
    })
    .then(() => {
      localStorage.setItem('token', token);
      return {
        response: {
          username,
          password,
          token
        }
      };
    })
    .catch(errors => ({ errors: errors.response.data }));
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
