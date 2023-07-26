import {
  render,
  screen,
  waitFor,
  waitForOptions,
} from '@testing-library/react';
import { WaitFor } from '@testing-library/react-hooks';
import {
  FunctionComponent,
  PropsWithChildren,
  useState,
  useEffect,
} from 'react';
import { act } from 'react-dom/test-utils';
import { ErrorBoundary } from 'react-error-boundary';
import React from 'react';

export type RenderAdditionalHook = <THookResult>(
  key: string,
  callback: () => THookResult,
) => {
  result: { current: THookResult; all: THookResult[] };
  waitFor: WaitFor;
};

export function prepareRenderMultipleHooks(options: {
  wrapper: FunctionComponent<PropsWithChildren<Record<string, never>>>;
}): {
  renderAdditionalHook: RenderAdditionalHook;
  waitForWrapperToBeReady: () => Promise<void>;
} {
  const RENDER_HOOK_EVENT = 'RENDER_HOOK_EVENT';
  const READY_STRING = 'READY_STRING';

  function TestComponents({
    addValues,
  }: {
    addValues: (vals: { key: string; value: unknown }[]) => void;
  }) {
    const [components, setComponents] = useState<JSX.Element[]>([]);

    useEffect(() => {
      const listener = (
        e: CustomEvent<{ key: string; callback: () => unknown }>,
      ) => {
        function TestComponent() {
          const hook = e.detail.callback();

          useEffect(() => {
            addValues([{ key: e.detail.key, value: hook }]);
          });
          return <></>;
        }
        act(() => {
          setComponents((prev) => [...prev, <TestComponent />]);
        });
      };
      //eslint-disable-next-line
      //@ts-ignore
      window.addEventListener(RENDER_HOOK_EVENT, listener);
      return () => {
        //eslint-disable-next-line
        //@ts-ignore
        window.removeEventListener(RENDER_HOOK_EVENT, listener);
      };
    }, []);

    return (
      <>
        {READY_STRING}
        {components.map((c, i) => {
          return <div key={i}>{c}</div>;
        })}
      </>
    );
  }
  const values: { key: string; value: unknown }[] = [];
  render(
    <ErrorBoundary onError={console.error} fallbackRender={() => <>error</>}>
      <options.wrapper>
        <TestComponents
          addValues={(vals) => {
            values.unshift(...vals);
          }}
        />
      </options.wrapper>
    </ErrorBoundary>,
  );

  return {
    waitForWrapperToBeReady: async () => {
      await waitFor(() => {
        return expect(screen.getByText(READY_STRING)).toBeInTheDocument();
      });
    },
    //eslint-disable-next-line
    //@ts-ignore
    //eslint-disable-next-line
    renderAdditionalHook: <THookResult extends unknown>(
      key: string,
      callback: () => THookResult,
    ) => {
      try {
        screen.getByText(READY_STRING);
      } catch (e) {
        throw new Error(
          'Wrapper is not ready yet, you might want to waitForWrapperToBeReady before rendering an additional hook',
        );
      }

      const event = new CustomEvent(RENDER_HOOK_EVENT, {
        detail: { key, callback },
      });
      //eslint-disable-next-line
      //@ts-ignore
      window.dispatchEvent(event);
      return {
        result: new Proxy(values, {
          get: (target, prop) => {
            if (prop === 'current') {
              return target.find((v) => v.key === key)?.value;
            }
            if (prop === 'all') {
              return target.filter((v) => v.key === key).map((v) => v.value);
            }
          },
        }),
        waitFor: (fn, options?: waitForOptions) =>
          waitFor(() => {
            return new Promise((resolve, reject) => {
              return fn() ? resolve() : reject();
            });
          }, options),
      };
    },
  };
}
