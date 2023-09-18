import { ReactNode, useCallback, useEffect } from 'react';
import { UseMutationResult } from 'react-query';
import { useToast } from './useToast';

export type MutationConfig<Data, Variables> = {
  mutation: UseMutationResult<Data, unknown, Variables, unknown>;
  name: string;
};

type DescriptionBuilder<Data> = {
  data?: Data;
  error?: unknown;
  name: string;
};

type MutationsHandlerProps<Data, Variables> = {
  mainMutation: MutationConfig<Data, Variables>;
  dependantMutations?: MutationConfig<Data, Variables>[];
  messageDescriptionBuilder: (
    successMutations: DescriptionBuilder<Data>[],
    errorMutations: DescriptionBuilder<Data>[],
  ) => ReactNode;
  toastStyles?: React.CSSProperties;
  onMainMutationSuccess?: () => void;
};

export const useMutationsHandler = <Data, Variables>({
  mainMutation,
  dependantMutations,
  messageDescriptionBuilder,
  toastStyles,
  onMainMutationSuccess,
}: MutationsHandlerProps<Data, Variables>) => {
  const { showToast } = useToast();
  const mutations = [
    mainMutation,
    ...(dependantMutations ? dependantMutations : []),
  ];

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

    const successDescriptionBuilder = successMutations.map((m) => ({
      data: m.mutation?.data,
      error: m.mutation?.error,
      name: m.name,
    }));

    const errorDescriptionBuilder = errorMutations.map((m) => ({
      data: m.mutation?.data,
      error: m.mutation?.error,
      name: m.name,
    }));

    if (loadingMutations.length === 0) {
      if (errorMutations.length > 0) {
        onMainMutationSuccess?.();
        showToast({
          open: true,
          status: 'error',
          message: messageDescriptionBuilder(
            successDescriptionBuilder,
            errorDescriptionBuilder,
          ),
          style: toastStyles,
        });
        return;
      } else if (successMutations.length > 0) {
        onMainMutationSuccess?.();
        showToast({
          open: true,
          status: 'success',
          message: messageDescriptionBuilder(
            successDescriptionBuilder,
            errorDescriptionBuilder,
          ),
          style: toastStyles,
        });
      }
    }
  }, [JSON.stringify(mutations)]);

  useEffect(() => {
    handleMutationsCompletion();
  }, [handleMutationsCompletion]);
};
