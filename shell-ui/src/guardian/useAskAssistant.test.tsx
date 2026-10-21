import { act, renderHook } from '@testing-library/react';
import { GuardianDrawerProvider, useAskAssistant, useGuardianDrawer } from './GuardianContext';

// GuardianDrawer — which owns the hook that posts to the iframe — is only mounted when
// canUseGuardian is set. Without it, asking would open nothing and leave a question nobody sends.
// `mock`-prefixed so jest allows the hoisted factory below to reference it.
const mockConfig: { value: Record<string, unknown> } = {
  value: { guardianOrigin: 'https://assistant.example', canUseGuardian: true },
};
jest.mock('../initFederation/ShellConfigProvider', () => ({ useShellConfig: () => ({ config: mockConfig.value }) }));

const setup = () =>
  renderHook(() => ({ ...useAskAssistant(), drawer: useGuardianDrawer() }), {
    wrapper: ({ children }) => <GuardianDrawerProvider>{children}</GuardianDrawerProvider>,
  });

it('opens the drawer and holds the question', () => {
  const { result } = setup();

  act(() => result.current.ask('Why did it fail?', 'id-1'));

  expect(result.current.isAvailable).toBe(true);
  expect(result.current.drawer.isOpen).toBe(true);
  expect(result.current.drawer.pendingPrompt).toEqual({ prompt: 'Why did it fail?', promptId: 'id-1' });
});

it('does nothing, and says so, when the assistant is not available', () => {
  mockConfig.value = { guardianOrigin: 'https://assistant.example' }; // no canUseGuardian
  const { result } = setup();

  act(() => result.current.ask('Why did it fail?', 'id-1'));

  expect(result.current.isAvailable).toBe(false);
  expect(result.current.drawer.isOpen).toBe(false);
  expect(result.current.drawer.pendingPrompt).toBeNull();
  mockConfig.value = { guardianOrigin: 'https://assistant.example', canUseGuardian: true };
});

it('ignores a blank question', () => {
  const { result } = setup();

  act(() => result.current.ask('   '));

  expect(result.current.drawer.isOpen).toBe(false);
});
