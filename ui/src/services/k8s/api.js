import ApiClient from '../ApiClient';
import { Config, Core_v1Api } from '@kubernetes/client-node';

export const ROLE_MASTER = 'node-role.kubernetes.io/master';
export const ROLE_NODE = 'node-role.kubernetes.io/node';
export const ROLE_ETCD = 'node-role.kubernetes.io/etcd';
export const ROLE_BOOTSTRAP = 'node-role.kubernetes.io/bootstrap';

let config, coreV1;
let k8sApiClient = null;

export function initialize(apiUrl) {
  k8sApiClient = new ApiClient({ apiUrl });
}

//Basic Auth
export function authenticate(token) {
  return k8sApiClient.get('/api/v1', null, {
    headers: {
      Authorization: 'Basic ' + token
    }
  });
}

export const updateApiServerConfig = (url, token) => {
  config = new Config(url, token, 'Basic');
  coreV1 = config.makeApiClient(Core_v1Api);
};

export async function getNodes() {
  try {
    return await coreV1.listNode();
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

export async function createNode(payload) {
  const body = {
    metadata: {
      name: payload.name,
      labels: {
        'metalk8s.scality.com/version': payload.version
      },
      annotations: {
        'metalk8s.scality.com/ssh-user': payload.ssh_user,
        'metalk8s.scality.com/ssh-port': payload.ssh_port,
        'metalk8s.scality.com/ssh-host': payload.hostName_ip,
        'metalk8s.scality.com/ssh-key-path': payload.ssh_key_path,
        'metalk8s.scality.com/ssh-sudo': payload.sudo_required.toString()
      }
    },
    spec: {
      taints: []
    }
  };

  if (payload.workload_plane && payload.control_plane) {
    body.metadata.labels[ROLE_MASTER] = '';
    body.metadata.labels[ROLE_NODE] = '';
    body.metadata.labels[ROLE_ETCD] = '';
  } else if (!payload.workload_plane && payload.control_plane) {
    body.metadata.labels[ROLE_MASTER] = '';
    body.metadata.labels[ROLE_ETCD] = '';

    body.spec.taints = body.spec.taints.concat([
      {
        key: ROLE_MASTER,
        effect: 'NoSchedule'
      },
      {
        key: ROLE_ETCD,
        effect: 'NoSchedule'
      }
    ]);
  } else if (payload.workload_plane && !payload.control_plane) {
    body.metadata.labels[ROLE_NODE] = '';
  }

  try {
    return await coreV1.createNode(body);
  } catch (error) {
    return { error };
  }
}
