import { QueryClient, QueryClientProvider as BaseQueryClientProvider } from 'react-query';

export const QueryClientProvider = BaseQueryClientProvider as React.ComponentType<{
  client: QueryClient;
  contextSharing?: boolean;
  children?: React.ReactNode;
}>;
