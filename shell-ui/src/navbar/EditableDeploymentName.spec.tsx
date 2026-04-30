import type { ComponentProps, PropsWithChildren } from 'react';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import { jest } from '@jest/globals';
import userEvent from '@testing-library/user-event';
import { QueryClient } from 'react-query';
import { CoreUiThemeProvider } from '@scality/core-ui/dist/components/coreuithemeprovider/CoreUiThemeProvider';
import { coreUIAvailableThemes } from '@scality/core-ui/dist/style/theme';

import { QueryClientProvider } from '../QueryClientProvider';
import { EditableDeploymentName } from './EditableDeploymentName';
import type { InstanceNameAdapter } from './InstanceName';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

type SetInstanceNameFn = (name: string) => Promise<void>;

function renderEditable(
  props: Partial<ComponentProps<typeof EditableDeploymentName>> & {
    setInstanceName?: jest.MockedFunction<SetInstanceNameFn>;
  } = {},
) {
  const queryClient = createTestQueryClient();
  const setInstanceName =
    props.setInstanceName ?? (jest.fn() as jest.MockedFunction<SetInstanceNameFn>).mockResolvedValue(undefined);

  const Wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>
      <CoreUiThemeProvider theme={coreUIAvailableThemes.darkRebrand}>{children}</CoreUiThemeProvider>
    </QueryClientProvider>
  );

  render(
    <EditableDeploymentName
      name={props.name ?? 'prod-cluster'}
      checkInstanceName={props.checkInstanceName}
      setInstanceName={setInstanceName}
    />,
    { wrapper: Wrapper },
  );
  return { setInstanceName };
}

async function openEditMode(name = 'prod-cluster') {
  await userEvent.click(screen.getByRole('button', { name }));
}

describe('EditableDeploymentName', () => {
  it('shows deployment name in view mode', () => {
    renderEditable({ name: 'my-deployment' });
    expect(screen.getByRole('button', { name: 'my-deployment' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('enters edit mode on click and focuses input with current name', async () => {
    renderEditable({ name: 'alpha' });
    await openEditMode('alpha');
    const input = screen.getByRole('textbox', { name: 'Deployment name' });
    expect(input).toBeInTheDocument();
    await waitFor(() => {
      expect(input).toHaveValue('alpha');
    });
  });

  it('closes edit mode on Escape without opening modal or calling setInstanceName', async () => {
    const { setInstanceName } = renderEditable();
    await openEditMode();
    await userEvent.type(screen.getByRole('textbox', { name: 'Deployment name' }), 'new-name');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(setInstanceName).not.toHaveBeenCalled();
  });

  it('closes edit mode on Enter when value unchanged (no modal, no setInstanceName)', async () => {
    const { setInstanceName } = renderEditable({ name: 'same' });
    await userEvent.click(screen.getByRole('button', { name: 'same' }));
    await userEvent.keyboard('{Enter}');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(setInstanceName).not.toHaveBeenCalled();
  });

  it('closes edit mode on blur when only whitespace (no modal, no setInstanceName)', async () => {
    const { setInstanceName } = renderEditable({ name: 'same' });
    await userEvent.click(screen.getByRole('button', { name: 'same' }));
    await userEvent.clear(screen.getByRole('textbox', { name: 'Deployment name' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Deployment name' }), '   ');
    await userEvent.tab();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(setInstanceName).not.toHaveBeenCalled();
  });

  it('shows inline validation error when checkInstanceName reports an error', async () => {
    const checkInstanceName: InstanceNameAdapter['checkInstanceName'] = jest.fn(() => ({
      hasError: true,
      message: 'Invalid deployment name',
    }));
    renderEditable({ checkInstanceName });
    await openEditMode();
    const input = screen.getByRole('textbox', { name: 'Deployment name' });
    await userEvent.clear(input);
    await userEvent.type(input, 'bad-value');
    await userEvent.keyboard('{Enter}');
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Invalid deployment name');
    expect(alert).toHaveAttribute('id', 'name-error');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(checkInstanceName).toHaveBeenCalledWith('bad-value');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps original "Current name" in modal when name prop changes after a failed rename', async () => {
    const setInstanceName = (jest.fn() as jest.MockedFunction<SetInstanceNameFn>).mockRejectedValue(
      new Error('K8s not available'),
    );
    const queryClient = createTestQueryClient();
    const Wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>
        <CoreUiThemeProvider theme={coreUIAvailableThemes.darkRebrand}>{children}</CoreUiThemeProvider>
      </QueryClientProvider>
    );
    const { rerender } = render(
      <EditableDeploymentName name="magenta-nature" setInstanceName={setInstanceName} />,
      { wrapper: Wrapper },
    );
    await userEvent.click(screen.getByRole('button', { name: 'magenta-nature' }));
    const input = screen.getByRole('textbox', { name: 'Deployment name' });
    await userEvent.clear(input);
    await userEvent.type(input, 'magenta-nature-2');
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Rename' }));
    const dialog = screen.getByRole('dialog');
    await waitFor(() => {
      expect(within(dialog).getByText('K8s not available')).toBeInTheDocument();
    });
    rerender(
      <EditableDeploymentName name="magenta-nature-2" setInstanceName={setInstanceName} />,
    );
    expect(within(dialog).getByText('magenta-nature')).toBeInTheDocument();
    expect(within(dialog).getByText('magenta-nature-2')).toBeInTheDocument();
  });

  it('shows danger banner in modal when setInstanceName rejects with Error', async () => {
    const { setInstanceName } = renderEditable({
      setInstanceName: (jest.fn() as jest.MockedFunction<SetInstanceNameFn>).mockRejectedValue(
        new Error('K8s not available'),
      ),
    });
    await openEditMode();
    const input = screen.getByRole('textbox', { name: 'Deployment name' });
    await userEvent.clear(input);
    await userEvent.type(input, 'new-name');
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Rename' }));
    const dialog = screen.getByRole('dialog');
    await waitFor(() => {
      expect(within(dialog).getByText('K8s not available')).toBeInTheDocument();
    });
    expect(within(dialog).getByText('Error renaming deployment')).toBeInTheDocument();
    expect(setInstanceName).toHaveBeenCalledWith('new-name');
  });

  it('shows default banner message when setInstanceName rejects with a non-Error value', async () => {
    const setInstanceName = (jest.fn() as jest.MockedFunction<SetInstanceNameFn>).mockRejectedValue('unknown');
    renderEditable({ setInstanceName });
    await openEditMode();
    const input = screen.getByRole('textbox', { name: 'Deployment name' });
    await userEvent.clear(input);
    await userEvent.type(input, 'new-name');
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Rename' }));
    const dialog = screen.getByRole('dialog');
    await waitFor(() => {
      expect(within(dialog).getByText('An error occurred while updating the deployment name')).toBeInTheDocument();
    });
    expect(setInstanceName).toHaveBeenCalledWith('new-name');
  });

  it('opens confirm modal on Enter when name trimmed differs', async () => {
    const { setInstanceName } = renderEditable();
    await openEditMode();
    const input = screen.getByRole('textbox', { name: 'Deployment name' });
    await userEvent.clear(input);
    await userEvent.type(input, 'new-cluster');
    await userEvent.keyboard('{Enter}');
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Rename deployment?' })).toBeInTheDocument();
    });
    expect(within(screen.getByRole('dialog')).getByText('prod-cluster')).toBeInTheDocument();
    expect(within(screen.getByRole('dialog')).getByText('new-cluster')).toBeInTheDocument();
    expect(setInstanceName).not.toHaveBeenCalled();
  });

  it('calls setInstanceName with trimmed name when Rename is confirmed', async () => {
    const { setInstanceName } = renderEditable();
    await openEditMode();
    const input = screen.getByRole('textbox', { name: 'Deployment name' });
    await userEvent.clear(input);
    await userEvent.type(input, '  renamed  ');
    await userEvent.keyboard('{Enter}');
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Rename' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(setInstanceName).toHaveBeenCalledWith('renamed');
  });

  it('closes modal on Cancel without calling setInstanceName', async () => {
    const { setInstanceName } = renderEditable();
    await openEditMode();
    const input = screen.getByRole('textbox', { name: 'Deployment name' });
    await userEvent.clear(input);
    await userEvent.type(input, 'x');
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(setInstanceName).not.toHaveBeenCalled();
  });

  it('does not enter edit mode while rename is in progress', async () => {
    const setInstanceName = jest
      .fn()
      .mockImplementation((): Promise<void> => new Promise(() => {})) as jest.MockedFunction<SetInstanceNameFn>;
    renderEditable({ setInstanceName });
    await openEditMode();
    const input = screen.getByRole('textbox', { name: 'Deployment name' });
    await userEvent.clear(input);
    await userEvent.type(input, 'x');
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Rename' }));
    await waitFor(() => expect(setInstanceName).toHaveBeenCalled());
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('prod-cluster')).toBeInTheDocument();
    await userEvent.click(screen.getByText('prod-cluster'));
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(setInstanceName).toHaveBeenCalledTimes(1);
  });

  it('starts edit from keyboard Enter on trigger when focusable', async () => {
    renderEditable();
    const trigger = screen.getByRole('button', { name: 'prod-cluster' });
    await act(async () => {
      trigger.focus();
    });
    await userEvent.keyboard('{Enter}');
    expect(screen.getByRole('textbox', { name: 'Deployment name' })).toBeInTheDocument();
  });

  it('updates displayed name when name prop changes in view mode', () => {
    const queryClient = createTestQueryClient();
    const setInstanceName = (jest.fn() as jest.MockedFunction<SetInstanceNameFn>).mockResolvedValue(undefined);
    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <CoreUiThemeProvider theme={coreUIAvailableThemes.darkRebrand}>
          <EditableDeploymentName name="before-change" setInstanceName={setInstanceName} />
        </CoreUiThemeProvider>
      </QueryClientProvider>,
    );
    expect(screen.getByRole('button', { name: 'before-change' })).toBeInTheDocument();
    rerender(
      <QueryClientProvider client={queryClient}>
        <CoreUiThemeProvider theme={coreUIAvailableThemes.darkRebrand}>
          <EditableDeploymentName name="after-change" setInstanceName={setInstanceName} />
        </CoreUiThemeProvider>
      </QueryClientProvider>,
    );
    expect(screen.getByRole('button', { name: 'after-change' })).toBeInTheDocument();
  });
});
