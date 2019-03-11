import axios from 'axios';

const baseUrl = 'https://reqres.in/';

export function callApi(endpoint) {
  const fullUrl =
    endpoint.indexOf(baseUrl) === -1 ? baseUrl + endpoint : endpoint;

  return axios.get(fullUrl);
}

export const fetchUserList = () => callApi('api/users');
