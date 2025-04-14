import { QueryKey } from '../core/types';
import { MutationFilters } from '../core/utils';
export declare function useIsMutating(filters?: MutationFilters): number;
export declare function useIsMutating(queryKey?: QueryKey, filters?: MutationFilters): number;
