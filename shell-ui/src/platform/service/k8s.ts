import { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { AUTHENTICATED_EVENT } from '../../navbar/events';
export const useGetNodesCount = (
  // @ts-expect-error - FIXME when you are working on it
  useEffect: typeof useEffect,
  // @ts-expect-error - FIXME when you are working on it
  useQuery: typeof useQuery,
  k8sUrl: string,
): {
  status: 'idle' | 'loading' | 'success' | 'error';
  nodesCount: number;
} => {
  const navbarElement = document.querySelector('solutions-navbar');
  const [token, setToken] = useState(null);
  // @ts-expect-error - FIXME when you are working on it
  useQuery('initialToken', () => navbarElement.getIdToken(), {
    onSucces: (idToken) => setToken(idToken),
  });
  useEffect(() => {
    if (!navbarElement) {
      return;
    }

    const onAuthenticated = (evt: Event) => {
      // @ts-expect-error - FIXME when you are working on it
      setToken(evt.detail.id_token);
    };

    navbarElement.addEventListener(AUTHENTICATED_EVENT, onAuthenticated);
    return () =>
      navbarElement.removeEventListener(AUTHENTICATED_EVENT, onAuthenticated);
  }, []);
  const queryNodesResult = useQuery(getNodesCountQuery(k8sUrl, token));
  queryNodesResult.nodesCount = queryNodesResult.data;
  delete queryNodesResult.data;
  return queryNodesResult;
};
export const useGetVolumesCount = (
  // @ts-expect-error - FIXME when you are working on it
  useEffect: typeof useEffect,
  // @ts-expect-error - FIXME when you are working on it
  useQuery: typeof useQuery,
  k8sUrl: string,
): {
  status: 'idle' | 'loading' | 'success' | 'error';
  volumesCount: number;
} => {
  const navbarElement = document.querySelector('solutions-navbar');
  const [token, setToken] = useState(null);
  // @ts-expect-error - FIXME when you are working on it
  useQuery('initialToken', () => navbarElement.getIdToken(), {
    onSucces: (idToken) => setToken(idToken),
  });
  useEffect(() => {
    if (!navbarElement) {
      return;
    }

    const onAuthenticated = (evt: Event) => {
      // @ts-expect-error - FIXME when you are working on it
      setToken(evt.detail.id_token);
    };

    navbarElement.addEventListener(AUTHENTICATED_EVENT, onAuthenticated);
    return () =>
      navbarElement.removeEventListener(AUTHENTICATED_EVENT, onAuthenticated);
  }, []);
  const queryVolumesResult = useQuery(getVolumesCountQuery(k8sUrl, token));
  queryVolumesResult.volumesCount = queryVolumesResult.data;
  delete queryVolumesResult.data;
  return queryVolumesResult;
};
export const getNodesCountQuery = (
  k8sUrl: string,
  token?: string | null,
): typeof useQuery => {
  return {
    // @ts-expect-error - FIXME when you are working on it
    queryKey: 'countNodes',
    queryFn: () =>
      fetch(`${k8sUrl}/api/v1/nodes`, {
        headers: {
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
    // @ts-expect-error - FIXME when you are working on it
    queryKey: 'countVolumes',
    queryFn: () =>
      fetch(`${k8sUrl}/api/v1/persistentvolumes`, {
        headers: {
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
