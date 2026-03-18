import { ReactNode, useEffect, useState } from 'react';
import { useAuth } from './PrivateRoute';
import { setHeaders } from '../services/prometheus/api';

export default function PrometheusAuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { userData } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (userData?.token) {
      setHeaders({ Authorization: `Bearer ${userData.token}` });
      setReady(true);
    }
  }, [userData?.token]);

  if (!ready) return null;

  return <>{children}</>;
}
