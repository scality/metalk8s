import { coreUIAvailableThemes } from '@scality/core-ui/dist/style/theme';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { GuardianDrawer } from './GuardianDrawer';

// `mock`-prefixed so jest allows the hoisted factories below to reference them.
const mockConfig: { value: Record<string, unknown> } = { value: {} };
jest.mock('../initFederation/ShellConfigProvider', () => ({ useShellConfig: () => ({ config: mockConfig.value }) }));
jest.mock('./GuardianContext', () => ({
  useHandedAssistantBackground: () => null,
  useGuardianDrawer: () => ({
    isOpen: true,
    iframeRef: { current: null },
    guardianOrigin: 'https://assistant.example',
    pendingPrompt: null,
    clearPendingPrompt: () => {},
  }),
}));
jest.mock('./guardianPostMessageHooks', () => ({
  useDiscoveryEmitter: () => {},
  useMcpCallHandler: () => {},
  usePromptEmitter: () => {},
}));

const renderDrawer = (productName: string) => {
  mockConfig.value = { productName };
  render(
    <ThemeProvider theme={coreUIAvailableThemes.darkRebrand}>
      <GuardianDrawer />
    </ThemeProvider>,
  );
  return screen.getByTitle('Guardian AI Assistant');
};

it('lets ARTESCA resize the drawer and see its own background through Guardian', () => {
  const frame = renderDrawer('Artesca');

  expect(frame).toHaveAttribute('src', 'https://assistant.example?source=artesca_ui');
  expect(frame).toHaveStyle({ background: 'transparent' });
  expect(screen.getByRole('separator', { name: 'Resize the Guardian assistant' })).toBeInTheDocument();
});

it('keeps the fixed, opaque drawer for the other consoles', () => {
  const frame = renderDrawer('RING');

  expect(frame).toHaveAttribute('src', 'https://assistant.example?source=ring_ui');
  expect(frame).toHaveStyle({ width: '500px' });
  expect(screen.queryByRole('separator')).not.toBeInTheDocument();
});
