import { act, renderHook } from '@testing-library/react-hooks';
import { useMutationsHandler } from './useMutationsHandler';
import { useToast } from './useToast';

jest.mock('./useToast', () => ({
  useToast: jest.fn(),
}));

describe('useMutationsHandler', () => {
  const mutations = [
    {
      mutation: {
        isLoading: false,
        isSuccess: true,
        isError: false,
        isIdle: false,
      },
      name: 'mutation1',
      isPrimary: true,
    },
    {
      mutation: {
        isLoading: false,
        isSuccess: false,
        isError: false,
        isIdle: true,
      },
      name: 'mutation2',
      isPrimary: false,
    },
  ];

  const messageDescriptionBuilder = jest.fn(() => 'message');

  it('should call onPrimarySuccess when a primary mutation succeeds', async () => {
    const showToast = jest.fn();
    const onPrimarySuccess = jest.fn();

    useToast.mockImplementation(() => ({
      showToast,
    }));

    const { waitFor } = renderHook(() =>
      useMutationsHandler({
        mutations,
        messageDescriptionBuilder,
        onPrimarySuccess,
      }),
    );

    await act(async () => {
      await waitFor(() => {
        expect(onPrimarySuccess).toHaveBeenCalled();
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
        mutations,
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
      ...mutations,
      {
        mutation: {
          isLoading: false,
          isSuccess: false,
          isError: true,
        },
        name: 'mutation3',
        isPrimary: false,
      },
    ];

    const { waitFor } = renderHook(() =>
      useMutationsHandler({
        mutations: mutationsWithError,
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
