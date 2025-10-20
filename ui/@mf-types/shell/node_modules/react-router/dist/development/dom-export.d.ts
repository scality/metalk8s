import * as React from 'react';
import { RouterProviderProps as RouterProviderProps$1, RouterInit } from 'react-router';

type RouterProviderProps = Omit<RouterProviderProps$1, "flushSync">;
declare function RouterProvider(props: Omit<RouterProviderProps, "flushSync">): React.JSX.Element;

/**
 * Props for the {@link dom.HydratedRouter} component.
 *
 * @category Types
 */
interface HydratedRouterProps {
    /**
     * Context object to be passed through to {@link createBrowserRouter} and made
     * available to
     * [`clientAction`](../../start/framework/route-module#clientAction)/[`clientLoader`](../../start/framework/route-module#clientLoader)
     * functions
     */
    unstable_getContext?: RouterInit["unstable_getContext"];
}
/**
 * Framework-mode router component to be used to hydrate a router from a
 * {@link ServerRouter}. See [`entry.client.tsx`](../framework-conventions/entry.client.tsx).
 *
 * @public
 * @category Framework Routers
 * @mode framework
 * @param props Props
 * @param {dom.HydratedRouterProps.unstable_getContext} props.unstable_getContext n/a
 * @returns A React element that represents the hydrated application.
 */
declare function HydratedRouter(props: HydratedRouterProps): React.JSX.Element;

export { HydratedRouter, type HydratedRouterProps, RouterProvider, type RouterProviderProps };
