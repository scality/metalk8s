import { act, renderHook } from '@testing-library/react-hooks';
import { MutationConfig, useMutationsHandler } from './useMutationsHandler';
import { useToast } from './useToast';

jest.mock('./useToast', () => ({
  useToast: jest.fn(),
}));

describe('useMutationsHandler', () => {
  const mainMutation = {
    mutation: {
      isLoading: false,
      isSuccess: true,
      isError: false,
      isIdle: false,
    },
    name: 'mutation1',
  } as MutationConfig<unknown, unknown>;
  const dependantMutations = [
    {
      mutation: {
        isLoading: false,
        isSuccess: true,
        isError: false,
        isIdle: false,
      },
      name: 'mutation2',
    },
    {
      mutation: {
        isLoading: false,
        isSuccess: false,
        isError: false,
        isIdle: true,
      },
      name: 'mutation3',
      isPrimary: false,
    },
  ] as MutationConfig<unknown, unknown>[];

  const messageDescriptionBuilder = jest.fn(() => 'message');

  it('should call onPrimarySuccess when a primary mutation succeeds', async () => {
    const showToast = jest.fn();
    const onMainMutationSuccess = jest.fn();

    useToast.mockImplementation(() => ({
      showToast,
    }));

    const { waitFor } = renderHook(() =>
      useMutationsHandler({
        mainMutation,
        dependantMutations,
        messageDescriptionBuilder,
        onMainMutationSuccess,
      }),
    );

    await act(async () => {
      await waitFor(() => {
        expect(onMainMutationSuccess).toHaveBeenCalled();
      });
    });
  });

  it('should show a success toast when all mutations succeed', async () => {
    const showToast = jest.fn();

    useToast.mockImplementation(() => ({
      showToast,
    }));

    const { waitFor } = renderHook(() =>
      useMutationsHandler({
        mainMutation,
        dependantMutations,
        messageDescriptionBuilder,
      }),
    );

    await act(async () => {
      await waitFor(() => {
        expect(showToast).toHaveBeenCalledWith({
          open: true,
          status: 'success',
          message: 'message',
        });
      });
    });
  });

  it('should show an error toast when at least one mutation fails', async () => {
    const showToast = jest.fn();

    useToast.mockImplementation(() => ({
      showToast,
    }));

    const mutationsWithError = [
      {
        mutation: {
          isLoading: false,
          isSuccess: false,
          isError: true,
        },
        name: 'mutation4',
      },
    ] as MutationConfig<unknown, unknown>[];

    const { waitFor } = renderHook(() =>
      useMutationsHandler({
        mainMutation,
        dependantMutations: mutationsWithError,
        messageDescriptionBuilder,
      }),
    );

    await act(async () => {
      await waitFor(() => {
        expect(showToast).toHaveBeenCalledWith({
          open: true,
          status: 'error',
          message: 'message',
        });
      });
    });
  });
});
