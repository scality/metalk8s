import type { PropsWithChildren } from 'react';
import React from 'react';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import { jest } from '@jest/globals';
import userEvent from '@testing-library/user-event';
import { CoreUiThemeProvider } from '@scality/core-ui/dist/components/coreuithemeprovider/CoreUiThemeProvider';
import { coreUIAvailableThemes } from '@scality/core-ui/dist/style/theme';

import { EditableDeploymentName } from './EditableDeploymentName';

const Wrapper = ({ children }: PropsWithChildren) => (
  <CoreUiThemeProvider theme={coreUIAvailableThemes.darkRebrand}>{children}</CoreUiThemeProvider>
);

function renderEditable(
  props: Partial<React.ComponentProps<typeof EditableDeploymentName>> & {
    onChange?: jest.Mock;
  } = {},
) {
  const onChange = props.onChange ?? jest.fn();
  render(
    <EditableDeploymentName
      name={props.name ?? 'prod-cluster'}
      isPropagating={props.isPropagating ?? false}
      onChange={onChange}
    />,
    { wrapper: Wrapper },
  );
  return { onChange };
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

  it('closes edit mode on Escape without opening modal or calling onChange', async () => {
    const { onChange } = renderEditable();
    await openEditMode();
    await userEvent.type(screen.getByRole('textbox', { name: 'Deployment name' }), 'new-name');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('closes edit mode on Enter when value unchanged (no modal, no onChange)', async () => {
    const { onChange } = renderEditable({ name: 'same' });
    await userEvent.click(screen.getByRole('button', { name: 'same' }));
    await userEvent.keyboard('{Enter}');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('closes edit mode on blur when only whitespace (no modal, no onChange)', async () => {
    const { onChange } = renderEditable({ name: 'same' });
    await userEvent.click(screen.getByRole('button', { name: 'same' }));
    await userEvent.clear(screen.getByRole('textbox', { name: 'Deployment name' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Deployment name' }), '   ');
    await userEvent.tab();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('opens confirm modal on Enter when name trimmed differs', async () => {
    const { onChange } = renderEditable();
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
    expect(onChange).not.toHaveBeenCalled();
  });

  it('calls onChange with trimmed name when Rename is confirmed', async () => {
    const { onChange } = renderEditable();
    await openEditMode();
    const input = screen.getByRole('textbox', { name: 'Deployment name' });
    await userEvent.clear(input);
    await userEvent.type(input, '  renamed  ');
    await userEvent.keyboard('{Enter}');
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Rename' }));
    expect(onChange).toHaveBeenCalledWith('renamed');
  });

  it('closes modal on Cancel without calling onChange', async () => {
    const { onChange } = renderEditable();
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
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not enter edit mode when propagating', async () => {
    const { onChange } = renderEditable({ isPropagating: true });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('prod-cluster')).toBeInTheDocument();
    await userEvent.click(screen.getByText('prod-cluster'));
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
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
    const { rerender } = render(
      <CoreUiThemeProvider theme={coreUIAvailableThemes.darkRebrand}>
        <EditableDeploymentName name="v1" isPropagating={false} onChange={() => {}} />
      </CoreUiThemeProvider>,
    );
    expect(screen.getByRole('button', { name: 'v1' })).toBeInTheDocument();
    rerender(
      <CoreUiThemeProvider theme={coreUIAvailableThemes.darkRebrand}>
        <EditableDeploymentName name="v2" isPropagating={false} onChange={() => {}} />
      </CoreUiThemeProvider>,
    );
    expect(screen.getByRole('button', { name: 'v2' })).toBeInTheDocument();
  });
});
