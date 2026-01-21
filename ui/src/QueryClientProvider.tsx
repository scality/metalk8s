import type { ComponentType, ReactNode } from 'react';
import { QueryClientProvider as BaseQueryClientProvider, type QueryClient } from 'react-query';

export const QueryClientProvider = BaseQueryClientProvider as ComponentType<{
  client: QueryClient;
  contextSharing?: boolean;
  children?: ReactNode;
}>;
