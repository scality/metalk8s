import axios from 'axios';

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

// Alerts

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

    axios.get(api + '/api/v1/query?query=' + query);

    return Promise.resolve(() => ({
      status: 'success',
      data: { resultType: 'vector', result: [] }
    }));
  } catch (error) {
    return { error };
  }
}
