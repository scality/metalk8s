//@flow
import { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import axios from 'axios';
import { AUTHENTICATED_EVENT } from '../../navbar/events';

const useGetNodesCount = (useQuery: typeof useQuery, k8sUrl: string) => {
  const navbarElement = document.querySelector('solutions-navbar');
  const [token, setToken] = useState(null);
  // $FlowFixMe
  useQuery('initialToken', () => navbarElement.getIdToken(), {
    onSucces: (idToken) => setToken(idToken),
  });

  useEffect(() => {
    if (!navbarElement) {
      return;
    }
    const onAuthenticated = (evt: Event) => {
      // $FlowFixMe
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

const useGetVolumesCount = (useQuery: typeof useQuery, k8sUrl: string) => {
  const navbarElement = document.querySelector('solutions-navbar');
  const [token, setToken] = useState(null);
  // $FlowFixMe
  useQuery('initialToken', () => navbarElement.getIdToken(), {
    onSucces: (idToken) => setToken(idToken),
  });

  useEffect(() => {
    if (!navbarElement) {
      return;
    }
    const onAuthenticated = (evt: Event) => {
      // $FlowFixMe
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
  if (!token) {
    console.error('K8s API Not authenticated');
    return;
  }
  return {
    cacheKey: 'countNodes',
    queryFn: () =>
      fetch(`${k8sUrl}/api/v1/nodes`)
        .then((r) => {
          if (r.ok) {
            return r.json();
          }
        })
        .then((res) => {
          return res.items.length;
        }),
    options: { refetchInterval: 10000 },
  };
};

export const getVolumesCountQuery = (
  k8sUrl: string,
  token?: string | null,
): typeof useQuery => {
  if (!token) {
    console.error('K8s API Not authenticated');
    return;
  }
  return {
    cacheKey: 'countVolumes',
    queryFn: () =>
      fetch(`${k8sUrl}/api/v1/persistentvolumes`, {
        headers: {
          authorisation: `bearer ${token}`,
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
    options: { refetchInterval: 10000 },
  };
};
