import { User } from 'oidc-client';
import ApiClient from '../ApiClient';
import { handleUnAuthorizedError } from '../errorhandler';
let saltApiClient = null;
export function getClient() {
  return saltApiClient;
}
export function initialize(apiUrl: string) {
  saltApiClient = new ApiClient({
    apiUrl,
  });
}
export type SaltToken = {
  return: [
    {
      token: string;
      expire: number;
      start: number;
      user: string;
      eauth: string;
      perms: (string | Record<string, string[]>)[];
    },
  ];
};
export async function authenticate(user: User) {
  if (!saltApiClient) {
    throw new Error('Salt api client should be defined.');
  }

  const payload = {
    eauth: 'kubernetes_rbac',
    // @ts-expect-error - FIXME when you are working on it
    username: `oidc:${user.email}`,
    // @ts-expect-error - FIXME when you are working on it
    token: user.token,
  };
  const result = await saltApiClient.post('/login', payload);

  if (result.error) {
    return handleUnAuthorizedError({
      error: result.error,
    });
  } else {
    return result;
  }
}
export async function deployNode(node: string, version: string) {
  if (!saltApiClient) {
    throw new Error('Salt api client should be defined.');
  }

  const result = saltApiClient.post('/', {
    client: 'runner_async',
    fun: 'state.orchestrate',
    arg: ['metalk8s.orchestrate.deploy_node'],
    kwarg: {
      saltenv: `metalk8s-${version}`,
      pillar: {
        orchestrate: {
          node_name: node,
        },
      },
    },
  });

  if (result.error) {
    return handleUnAuthorizedError({
      error: result.error,
    });
  } else {
    return result;
  }
}
export async function printJob(jid: string) {
  if (!saltApiClient) {
    throw new Error('Salt api client should be defined.');
  }

  const result = saltApiClient.post('/', {
    client: 'runner',
    fun: 'jobs.print_job',
    arg: [jid],
  });

  if (result.error) {
    return handleUnAuthorizedError({
      error: result.error,
    });
  } else {
    return result;
  }
}
export type PlanesInterfaces = {
  control_plane: {
    ip: string | null;
    interface: string | null;
  };
  workload_plane: {
    ip: string | null;
    interface: string | null;
  };
};

/*
`metalk8s_network.get_planes_interfaces` resolves the interface holding each
plane IP live, on the minion. We deliberately do NOT read the `ip_interfaces`
grain here: grains are only computed when the minion daemon starts, which may
happen before the interface holding the IP exists (bond, VLAN, ...), and they
are not refreshed automatically afterwards -- so the grain can permanently
disagree with the running system.

An `interface` is null when no interface holds the plane IP. We may also get an
error message instead of a PlanesInterfaces object.
{
  "return": [
    {
      "bootstrap": {
        "control_plane": {
          "ip": "10.200.6.201",
          "interface": "eth0"
        },
        "workload_plane": {
          "ip": "10.200.6.201",
          "interface": "eth0"
        }
      },
      "nodename": "Minion did not return. [No response]\nThe minions may not have all finished running and any remaining minions will return upon completion. To look up the return data for this job later, run the following command:\n\nsalt-run jobs.lookup_jid 20210429184803777520"
    }
  ]
}
*/
export async function getNodesIPsInterfaces(nodeNames: string[]): Promise<{
  return: [Record<string, boolean | PlanesInterfaces | string>];
}> {
  if (!saltApiClient) {
    throw new Error('Salt api client should be defined.');
  }

  const result = saltApiClient.post('/', {
    client: 'local',
    tgt: nodeNames.join(','),
    tgt_type: 'list',
    fun: 'metalk8s_network.get_planes_interfaces',
  });

  if (result.error) {
    // @ts-expect-error - FIXME when you are working on it
    return handleUnAuthorizedError({
      error: result.error,
    });
  } else {
    return result;
  }
}
