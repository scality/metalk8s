import { ReactNode, useLayoutEffect } from 'react';
import { useAuth } from './PrivateRoute';
import { setHeaders } from '../services/prometheus/api';

// Temporary solution: The Prometheus API client is initialized with the URL in the saga
// (setApiConfig), but the auth token is not available at that point. Rather than modifying
// the saga (which will be removed soon), this provider sets the auth header on the shared
// Prometheus client once the token is available, and blocks rendering until it's ready.
// TODO: Remove this provider once the saga is removed.

export default function PrometheusAuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { userData } = useAuth();
  const token = userData?.token;

  useLayoutEffect(() => {
    if (token) {
      setHeaders({ Authorization: `Bearer ${token}` });
    }
  }, [token]);

  if (!token) return null;

  return <>{children}</>;
}
