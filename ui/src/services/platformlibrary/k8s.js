//@flow
import { useQuery } from 'react-query';

export const getNodesCountQuery = (
  k8sUrl: string,
  token?: string | null,
): typeof useQuery => {
  return {
    queryKey: 'countNodes',
    queryFn: () =>
      fetch(`${k8sUrl}/api/v1/nodes`, {
        headers: {
          // $FlowFixMe - if token is null, the query will not perform
          authorization: `bearer ${token}`,
        },
      })
        .then((r) => {
          if (r.ok) {
            return r.json();
          }
        })
        .then((res) => {
          return res.items.length;
        }),
    refetchInterval: 10000,
    enabled: token ? true : false,
  };
};

export const getVolumesCountQuery = (
  k8sUrl: string,
  token?: string | null,
): typeof useQuery => {
  return {
    queryKey: 'countVolumes',
    queryFn: () =>
      fetch(`${k8sUrl}/api/v1/persistentvolumes`, {
        headers: {
          // $FlowFixMe - if token is null, the query will not perform
          authorization: `bearer ${token}`,
        },
      })
        .then((r) => {
          if (r.ok) {
            return r.json();
          }
        })
        .then((res) => {
          return res.items.length;
        }),
    refetchInterval: 10000,
    enabled: token ? true : false,
  };
};
