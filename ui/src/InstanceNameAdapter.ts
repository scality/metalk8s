// import { API_PREFIX } from './actions/overview/constants';
// import config from './config';

const fakeAPI = {
  instanceName: 'Super Supervisor',
  fetchInstanceName: function () {
    return Promise.resolve(this.instanceName);
  },
  postInstanceName: function (name) {
    this.instanceName = name;
    return Promise.resolve(this.instanceName);
  },
};

export async function getInstanceName(userData) {
  if (!userData?.token) {
    throw new Error('No token provided');
  }

  console.log('fetchInstanceName', fakeAPI);

  const response = await fakeAPI.fetchInstanceName();

  return response || 'Default Supervisor';
}

export async function setInstanceName(userData, name) {
  if (!userData?.token) {
    throw new Error('No token provided');
  }

  if (!name) {
    throw new Error('No name provided');
  }

  return fakeAPI.postInstanceName(name);
}
