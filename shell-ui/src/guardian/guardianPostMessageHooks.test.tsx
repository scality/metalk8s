import { act, renderHook } from '@testing-library/react';
import { GuardianDrawerProvider, useGuardianDrawer } from './GuardianContext';
import { rememberGuardianHints } from '../mcp/toolMeta';
import { useDiscoveryEmitter, usePromptEmitter } from './guardianPostMessageHooks';

jest.mock('../initFederation/ShellConfigProvider', () => ({
  useShellConfig: () => ({ config: { guardianOrigin: 'https://assistant.example', canUseGuardian: true } }),
}));

// The emitter posts blindly — nothing acknowledges — so what has to hold is that it STOPS.
const ORIGIN = 'https://assistant.example';
const prompt = { prompt: 'Why did the software upgrade fail?', promptId: 'upgrade-failed' };

const emitter = () => {
  const postMessage = jest.fn();
  const iframeRef = { current: { contentWindow: { postMessage } } } as unknown as React.RefObject<HTMLIFrameElement>;
  return { postMessage, iframeRef };
};

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

it('stops after 20s, having posted once per 500ms', () => {
  const { postMessage, iframeRef } = emitter();
  const onDelivered = jest.fn();

  renderHook(() => usePromptEmitter(iframeRef, ORIGIN, prompt, onDelivered));

  expect(postMessage).toHaveBeenCalledTimes(1); // immediately, before any interval
  jest.advanceTimersByTime(20_000);

  expect(postMessage).toHaveBeenCalledTimes(41); // the first, plus 20000/500
  expect(onDelivered).toHaveBeenCalledTimes(1);

  // The point of the test: the hook stopped on its own. `onDelivered` is a bare mock here, so
  // nothing cleared the pending prompt — if the interval outlived the timeout, this would climb.
  jest.advanceTimersByTime(5_000);
  expect(postMessage).toHaveBeenCalledTimes(41);
});

it('posts nothing at all without a question', () => {
  const { postMessage, iframeRef } = emitter();

  renderHook(() => usePromptEmitter(iframeRef, ORIGIN, null, jest.fn()));
  jest.advanceTimersByTime(60_000);

  expect(postMessage).not.toHaveBeenCalled();
});

it('carries the id, which is what makes repeating safe', () => {
  const { postMessage, iframeRef } = emitter();

  renderHook(() => usePromptEmitter(iframeRef, ORIGIN, prompt, jest.fn()));

  expect(postMessage).toHaveBeenCalledWith({ type: 'GUARDIAN_PROMPT', ...prompt }, ORIGIN);
});

it('does not toggle a drawer that is already open', () => {
  // `toggle` would CLOSE it, which is the opposite of what an "ask" button means.
  const { result, rerender } = renderHook(() => useGuardianDrawer(), {
    wrapper: ({ children }) => <GuardianDrawerProvider>{children}</GuardianDrawerProvider>,
  });

  act(() => result.current.open());
  expect(result.current.isOpen).toBe(true);

  act(() => result.current.open());
  rerender();
  expect(result.current.isOpen).toBe(true);
});

it('clears the pending question when it changes, so the old one stops being posted', () => {
  const { postMessage, iframeRef } = emitter();
  const { rerender } = renderHook(({ p }) => usePromptEmitter(iframeRef, ORIGIN, p, jest.fn()), {
    initialProps: { p: prompt as { prompt: string; promptId: string } | null },
  });

  jest.advanceTimersByTime(1_000);
  const posted = postMessage.mock.calls.length;

  rerender({ p: null });
  jest.advanceTimersByTime(5_000);

  expect(postMessage).toHaveBeenCalledTimes(posted);
});

describe('tool discovery', () => {
  const registration = new AbortController();

  afterEach(() => {
    registration.abort();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (document as any).modelContext;
  });

  it("announces each tool with the _meta its app's hints map to, which listTools drops", () => {
    const { postMessage, iframeRef } = emitter();
    rememberGuardianHints('diagnose', { reveals: ['readLog'] }, registration.signal);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (document as any).modelContext = { listTools: () => [{ name: 'diagnose' }, { name: 'readLog' }] };

    renderHook(() => useDiscoveryEmitter(iframeRef, ORIGIN));
    jest.advanceTimersByTime(3_000);

    expect(postMessage).toHaveBeenCalledWith(
      {
        type: 'MCP_DISCOVERY',
        tools: [{ name: 'diagnose', _meta: { 'scality.guardian/reveals': ['readLog'] } }, { name: 'readLog' }],
      },
      ORIGIN,
    );
  });
});

it('carries the tools the asking page wants the assistant to start with', () => {
  const { postMessage, iframeRef } = emitter();
  const asked = { ...prompt, preferredTools: ['diagnoseSoftwareUpgrade'] };

  renderHook(() => usePromptEmitter(iframeRef, ORIGIN, asked, jest.fn()));

  expect(postMessage).toHaveBeenCalledWith({ type: 'GUARDIAN_PROMPT', ...asked }, ORIGIN);
});
