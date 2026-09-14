import { ComponentType, ReactNode } from 'react';
import { QueryClient, QueryClientProvider as BaseQueryClientProvider } from 'react-query';

export const QueryClientProvider = BaseQueryClientProvider as ComponentType<{
  client: QueryClient;
  contextSharing?: boolean;
  children?: ReactNode;
}>;
