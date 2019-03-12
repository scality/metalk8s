import axios from 'axios';

const baseUrl = 'https://reqres.in/';
export function callApi(type, endpoint, args) {
  const fullUrl =
    endpoint.indexOf(baseUrl) === -1 ? baseUrl + endpoint : endpoint;

  return axios[type](fullUrl, args);
}
export const fetchUserList = () => callApi('get', 'api/users');

export const authenticate = ({ email, password }) =>
  callApi('post', 'api/login', { email, password });
