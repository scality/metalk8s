import axios from 'axios';

export async function getAlerts(api) {
  try {
    return axios.get(api + '/api/v1/alerts');
  } catch (error) {
    return { error };
  }
}

export async function getClusterStatus(api) {
  try {
    const query =
      'sum(up{job=~"apiserver|kube-scheduler|kube-controller-manager"} == 0)';
    return axios.get(api + '/api/v1/query?query=' + query);
  } catch (error) {
    return { error };
  }
}
