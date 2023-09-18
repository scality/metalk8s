import { ReactNode, useCallback, useEffect } from 'react';
import { UseMutationResult } from 'react-query';
import { useToast } from './useToast';

export type MutationConfig<Data, Variables> = {
  mutation: UseMutationResult<Data, unknown, Variables, unknown>;
  name: string;
  isPrimary: boolean;
};

type MutationsHandlerProps<Data, Variables> = {
  mutations: MutationConfig<Data, Variables>[];
  messageDescriptionBuilder: (
    successMutations: MutationConfig<Data, Variables>[],
    errorMutations: MutationConfig<Data, Variables>[],
  ) => ReactNode;
  style?: React.CSSProperties;
  onPrimarySuccess?: () => void;
};

export const useMutationsHandler = <Data, Variables>({
  mutations,
  messageDescriptionBuilder,
  style,
  onPrimarySuccess,
}: MutationsHandlerProps<Data, Variables>) => {
  const { showToast } = useToast();

  const handleMutationsCompletion = useCallback(async () => {
    const results = await Promise.all(mutations.map((m) => m.mutation));

    const loadingMutations = mutations.filter(
      (_, index) => results[index].isLoading,
    );
    const successMutations = mutations.filter(
      (_, index) => results[index].isSuccess,
    );
    const errorMutations = mutations.filter(
      (_, index) => results[index].isError,
    );

    if (loadingMutations.length === 0) {
      if (errorMutations.length > 0) {
        showToast({
          open: true,
          status: 'error',
          message: messageDescriptionBuilder(successMutations, errorMutations),
          style,
        });
        return;
      } else if (successMutations.length > 0) {
        const isPrimary = successMutations.some((m) => m.isPrimary);
        if (isPrimary) {
          onPrimarySuccess?.();
        }
        showToast({
          open: true,
          status: 'success',
          message: messageDescriptionBuilder(successMutations, errorMutations),
          style,
        });
      }
    }
  }, [JSON.stringify(mutations)]);

  useEffect(() => {
    handleMutationsCompletion();
  }, [handleMutationsCompletion]);
};
