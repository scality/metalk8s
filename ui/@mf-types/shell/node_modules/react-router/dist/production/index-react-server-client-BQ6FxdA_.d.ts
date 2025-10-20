import { I as InitialEntry, T as To, i as RelativeRoutingType, w as NonIndexRouteObject, ag as LazyRouteFunction, q as IndexRouteObject, a as Location, A as Action, aD as Navigator, d as Router$1, V as RouterInit, aZ as FutureConfig$1, H as HydrationState, D as DataStrategyFunction, X as PatchRoutesOnNavigationFunction, p as RouteObject, aF as RouteMatch, o as Params, U as UIMatch, af as HTMLFormMethod, ad as FormEncType, a_ as RouteManifest, a$ as ServerRouteModule, z as MiddlewareEnabled, y as unstable_RouterContextProvider, x as AppLoadContext, ah as LoaderFunctionArgs, a7 as ActionFunctionArgs, e as RouteModules, Y as DataRouteObject, K as ClientLoaderFunction, a0 as StaticHandlerContext, aK as PageLinkDescriptor, b0 as History, $ as GetScrollRestorationKeyFunction, f as NavigateOptions, a1 as Fetcher, h as SerializeFrom, B as BlockerFunction, b1 as CreateStaticHandlerOptions$1, Z as StaticHandler } from './routeModules-C3oqzPpI.js';
import * as React from 'react';

declare function mapRouteProperties(route: RouteObject): Partial<RouteObject> & {
    hasErrorBoundary: boolean;
};
declare const hydrationRouteProperties: (keyof RouteObject)[];
/**
 * @category Data Routers
 */
interface MemoryRouterOpts {
    /**
     * Basename path for the application.
     */
    basename?: string;
    /**
     * A function that returns an {@link unstable_RouterContextProvider} instance
     * which is provided as the `context` argument to client [`action`](../../start/data/route-object#action)s,
     * [`loader`](../../start/data/route-object#loader)s and [middleware](../../how-to/middleware).
     * This function is called to generate a fresh `context` instance on each
     * navigation or fetcher call.
     */
    unstable_getContext?: RouterInit["unstable_getContext"];
    /**
     * Future flags to enable for the router.
     */
    future?: Partial<FutureConfig$1>;
    /**
     * Hydration data to initialize the router with if you have already performed
     * data loading on the server.
     */
    hydrationData?: HydrationState;
    /**
     * Initial entries in the in-memory history stack
     */
    initialEntries?: InitialEntry[];
    /**
     * Index of `initialEntries` the application should initialize to
     */
    initialIndex?: number;
    /**
     * Override the default data strategy of loading in parallel.
     * Only intended for advanced usage.
     */
    dataStrategy?: DataStrategyFunction;
    /**
     * Lazily define portions of the route tree on navigations.
     */
    patchRoutesOnNavigation?: PatchRoutesOnNavigationFunction;
}
/**
 * Create a new {@link DataRouter} that manages the application path using an
 * in-memory [`History`](https://developer.mozilla.org/en-US/docs/Web/API/History)
 * stack. Useful for non-browser environments without a DOM API.
 *
 * @public
 * @category Data Routers
 * @mode data
 * @param routes Application routes
 * @param opts Options
 * @param {MemoryRouterOpts.basename} opts.basename n/a
 * @param {MemoryRouterOpts.dataStrategy} opts.dataStrategy n/a
 * @param {MemoryRouterOpts.future} opts.future n/a
 * @param {MemoryRouterOpts.unstable_getContext} opts.unstable_getContext n/a
 * @param {MemoryRouterOpts.hydrationData} opts.hydrationData n/a
 * @param {MemoryRouterOpts.initialEntries} opts.initialEntries n/a
 * @param {MemoryRouterOpts.initialIndex} opts.initialIndex n/a
 * @param {MemoryRouterOpts.patchRoutesOnNavigation} opts.patchRoutesOnNavigation n/a
 * @returns An initialized {@link DataRouter} to pass to {@link RouterProvider | `<RouterProvider>`}
 */
declare function createMemoryRouter(routes: RouteObject[], opts?: MemoryRouterOpts): Router$1;
/**
 * @category Types
 */
interface RouterProviderProps {
    /**
     * The {@link DataRouter} instance to use for navigation and data fetching.
     */
    router: Router$1;
    /**
     * The [`ReactDOM.flushSync`](https://react.dev/reference/react-dom/flushSync)
     * implementation to use for flushing updates.
     *
     * You usually don't have to worry about this:
     * - The `RouterProvider` exported from `react-router/dom` handles this internally for you
     * - If you are rendering in a non-DOM environment, you can import
     *   `RouterProvider` from `react-router` and ignore this prop
     */
    flushSync?: (fn: () => unknown) => undefined;
}
/**
 * Render the UI for the given {@link DataRouter}. This component should
 * typically be at the top of an app's element tree.
 *
 * ```tsx
 * import { createBrowserRouter } from "react-router";
 * import { RouterProvider } from "react-router/dom";
 * import { createRoot } from "react-dom/client";
 *
 * const router = createBrowserRouter(routes);
 * createRoot(document.getElementById("root")).render(
 *   <RouterProvider router={router} />
 * );
 * ```
 *
 * <docs-info>Please note that this component is exported both from
 * `react-router` and `react-router/dom` with the only difference being that the
 * latter automatically wires up `react-dom`'s [`flushSync`](https://react.dev/reference/react-dom/flushSync)
 * implementation. You _almost always_ want to use the version from
 * `react-router/dom` unless you're running in a non-DOM environment.</docs-info>
 *
 *
 * @public
 * @category Data Routers
 * @mode data
 * @param props Props
 * @param {RouterProviderProps.flushSync} props.flushSync n/a
 * @param {RouterProviderProps.router} props.router n/a
 * @returns React element for the rendered router
 */
declare function RouterProvider({ router, flushSync: reactDomFlushSyncImpl, }: RouterProviderProps): React.ReactElement;
/**
 * @category Types
 */
interface MemoryRouterProps {
    /**
     * Application basename
     */
    basename?: string;
    /**
     * Nested {@link Route} elements describing the route tree
     */
    children?: React.ReactNode;
    /**
     * Initial entries in the in-memory history stack
     */
    initialEntries?: InitialEntry[];
    /**
     * Index of `initialEntries` the application should initialize to
     */
    initialIndex?: number;
}
/**
 * A declarative {@link Router | `<Router>`} that stores all entries in memory.
 *
 * @public
 * @category Declarative Routers
 * @mode declarative
 * @param props Props
 * @param {MemoryRouterProps.basename} props.basename n/a
 * @param {MemoryRouterProps.children} props.children n/a
 * @param {MemoryRouterProps.initialEntries} props.initialEntries n/a
 * @param {MemoryRouterProps.initialIndex} props.initialIndex n/a
 * @returns A declarative in-memory {@link Router | `<Router>`} for client-side
 * routing.
 */
declare function MemoryRouter({ basename, children, initialEntries, initialIndex, }: MemoryRouterProps): React.ReactElement;
/**
 * @category Types
 */
interface NavigateProps {
    /**
     * The path to navigate to. This can be a string or a {@link Path} object
     */
    to: To;
    /**
     * Whether to replace the current entry in the [`History`](https://developer.mozilla.org/en-US/docs/Web/API/History)
     * stack
     */
    replace?: boolean;
    /**
     * State to pass to the new {@link Location} to store in [`history.state`](https://developer.mozilla.org/en-US/docs/Web/API/History/state).
     */
    state?: any;
    /**
     * How to interpret relative routing in the `to` prop.
     * See {@link RelativeRoutingType}.
     */
    relative?: RelativeRoutingType;
}
/**
 * A component-based version of {@link useNavigate} to use in a
 * [`React.Component` class](https://react.dev/reference/react/Component) where
 * hooks cannot be used.
 *
 * It's recommended to avoid using this component in favor of {@link useNavigate}.
 *
 * @example
 * <Navigate to="/tasks" />
 *
 * @public
 * @category Components
 * @param props Props
 * @param {NavigateProps.relative} props.relative n/a
 * @param {NavigateProps.replace} props.replace n/a
 * @param {NavigateProps.state} props.state n/a
 * @param {NavigateProps.to} props.to n/a
 * @returns {void}
 *
 */
declare function Navigate({ to, replace, state, relative, }: NavigateProps): null;
/**
 * @category Types
 */
interface OutletProps {
    /**
     * Provides a context value to the element tree below the outlet. Use when
     * the parent route needs to provide values to child routes.
     *
     * ```tsx
     * <Outlet context={myContextValue} />
     * ```
     *
     * Access the context with {@link useOutletContext}.
     */
    context?: unknown;
}
/**
 * Renders the matching child route of a parent route or nothing if no child
 * route matches.
 *
 * @example
 * import { Outlet } from "react-router";
 *
 * export default function SomeParent() {
 *   return (
 *     <div>
 *       <h1>Parent Content</h1>
 *       <Outlet />
 *     </div>
 *   );
 * }
 *
 * @public
 * @category Components
 * @param props Props
 * @param {OutletProps.context} props.context n/a
 * @returns React element for the rendered outlet or `null` if no child route matches.
 */
declare function Outlet(props: OutletProps): React.ReactElement | null;
/**
 * @category Types
 */
interface PathRouteProps {
    /**
     * Whether the path should be case-sensitive. Defaults to `false`.
     */
    caseSensitive?: NonIndexRouteObject["caseSensitive"];
    /**
     * The path pattern to match. If unspecified or empty, then this becomes a
     * layout route.
     */
    path?: NonIndexRouteObject["path"];
    /**
     * The unique identifier for this route (for use with {@link DataRouter}s)
     */
    id?: NonIndexRouteObject["id"];
    /**
     * A function that returns a promise that resolves to the route object.
     * Used for code-splitting routes.
     * See [`lazy`](../../start/data/route-object#lazy).
     */
    lazy?: LazyRouteFunction<NonIndexRouteObject>;
    /**
     * The route loader.
     * See [`loader`](../../start/data/route-object#loader).
     */
    loader?: NonIndexRouteObject["loader"];
    /**
     * The route action.
     * See [`action`](../../start/data/route-object#action).
     */
    action?: NonIndexRouteObject["action"];
    hasErrorBoundary?: NonIndexRouteObject["hasErrorBoundary"];
    /**
     * The route shouldRevalidate function.
     * See [`shouldRevalidate`](../../start/data/route-object#shouldRevalidate).
     */
    shouldRevalidate?: NonIndexRouteObject["shouldRevalidate"];
    /**
     * The route handle.
     */
    handle?: NonIndexRouteObject["handle"];
    /**
     * Whether this is an index route.
     */
    index?: false;
    /**
     * Child Route components
     */
    children?: React.ReactNode;
    /**
     * The React element to render when this Route matches.
     * Mutually exclusive with `Component`.
     */
    element?: React.ReactNode | null;
    /**
     * The React element to render while this router is loading data.
     * Mutually exclusive with `HydrateFallback`.
     */
    hydrateFallbackElement?: React.ReactNode | null;
    /**
     * The React element to render at this route if an error occurs.
     * Mutually exclusive with `ErrorBoundary`.
     */
    errorElement?: React.ReactNode | null;
    /**
     * The React Component to render when this route matches.
     * Mutually exclusive with `element`.
     */
    Component?: React.ComponentType | null;
    /**
     * The React Component to render while this router is loading data.
     * Mutually exclusive with `hydrateFallbackElement`.
     */
    HydrateFallback?: React.ComponentType | null;
    /**
     * The React Component to render at this route if an error occurs.
     * Mutually exclusive with `errorElement`.
     */
    ErrorBoundary?: React.ComponentType | null;
}
/**
 * @category Types
 */
interface LayoutRouteProps extends PathRouteProps {
}
/**
 * @category Types
 */
interface IndexRouteProps {
    /**
     * Whether the path should be case-sensitive. Defaults to `false`.
     */
    caseSensitive?: IndexRouteObject["caseSensitive"];
    /**
     * The path pattern to match. If unspecified or empty, then this becomes a
     * layout route.
     */
    path?: IndexRouteObject["path"];
    /**
     * The unique identifier for this route (for use with {@link DataRouter}s)
     */
    id?: IndexRouteObject["id"];
    /**
     * A function that returns a promise that resolves to the route object.
     * Used for code-splitting routes.
     * See [`lazy`](../../start/data/route-object#lazy).
     */
    lazy?: LazyRouteFunction<IndexRouteObject>;
    /**
     * The route loader.
     * See [`loader`](../../start/data/route-object#loader).
     */
    loader?: IndexRouteObject["loader"];
    /**
     * The route action.
     * See [`action`](../../start/data/route-object#action).
     */
    action?: IndexRouteObject["action"];
    hasErrorBoundary?: IndexRouteObject["hasErrorBoundary"];
    /**
     * The route shouldRevalidate function.
     * See [`shouldRevalidate`](../../start/data/route-object#shouldRevalidate).
     */
    shouldRevalidate?: IndexRouteObject["shouldRevalidate"];
    /**
     * The route handle.
     */
    handle?: IndexRouteObject["handle"];
    /**
     * Whether this is an index route.
     */
    index: true;
    /**
     * Child Route components
     */
    children?: undefined;
    /**
     * The React element to render when this Route matches.
     * Mutually exclusive with `Component`.
     */
    element?: React.ReactNode | null;
    /**
     * The React element to render while this router is loading data.
     * Mutually exclusive with `HydrateFallback`.
     */
    hydrateFallbackElement?: React.ReactNode | null;
    /**
     * The React element to render at this route if an error occurs.
     * Mutually exclusive with `ErrorBoundary`.
     */
    errorElement?: React.ReactNode | null;
    /**
     * The React Component to render when this route matches.
     * Mutually exclusive with `element`.
     */
    Component?: React.ComponentType | null;
    /**
     * The React Component to render while this router is loading data.
     * Mutually exclusive with `hydrateFallbackElement`.
     */
    HydrateFallback?: React.ComponentType | null;
    /**
     * The React Component to render at this route if an error occurs.
     * Mutually exclusive with `errorElement`.
     */
    ErrorBoundary?: React.ComponentType | null;
}
type RouteProps = PathRouteProps | LayoutRouteProps | IndexRouteProps;
/**
 * Configures an element to render when a pattern matches the current location.
 * It must be rendered within a {@link Routes} element. Note that these routes
 * do not participate in data loading, actions, code splitting, or any other
 * route module features.
 *
 * @example
 * // Usually used in a declarative router
 * function App() {
 *   return (
 *     <BrowserRouter>
 *       <Routes>
 *         <Route index element={<StepOne />} />
 *         <Route path="step-2" element={<StepTwo />} />
 *         <Route path="step-3" element={<StepThree />} />
 *       </Routes>
 *    </BrowserRouter>
 *   );
 * }
 *
 * // But can be used with a data router as well if you prefer the JSX notation
 * const routes = createRoutesFromElements(
 *   <>
 *     <Route index loader={step1Loader} Component={StepOne} />
 *     <Route path="step-2" loader={step2Loader} Component={StepTwo} />
 *     <Route path="step-3" loader={step3Loader} Component={StepThree} />
 *   </>
 * );
 *
 * const router = createBrowserRouter(routes);
 *
 * function App() {
 *   return <RouterProvider router={router} />;
 * }
 *
 * @public
 * @category Components
 * @param props Props
 * @param {PathRouteProps.action} props.action n/a
 * @param {PathRouteProps.caseSensitive} props.caseSensitive n/a
 * @param {PathRouteProps.Component} props.Component n/a
 * @param {PathRouteProps.children} props.children n/a
 * @param {PathRouteProps.element} props.element n/a
 * @param {PathRouteProps.ErrorBoundary} props.ErrorBoundary n/a
 * @param {PathRouteProps.errorElement} props.errorElement n/a
 * @param {PathRouteProps.handle} props.handle n/a
 * @param {PathRouteProps.HydrateFallback} props.HydrateFallback n/a
 * @param {PathRouteProps.hydrateFallbackElement} props.hydrateFallbackElement n/a
 * @param {PathRouteProps.id} props.id n/a
 * @param {PathRouteProps.index} props.index n/a
 * @param {PathRouteProps.lazy} props.lazy n/a
 * @param {PathRouteProps.loader} props.loader n/a
 * @param {PathRouteProps.path} props.path n/a
 * @param {PathRouteProps.shouldRevalidate} props.shouldRevalidate n/a
 * @returns {void}
 */
declare function Route$1(props: RouteProps): React.ReactElement | null;
/**
 * @category Types
 */
interface RouterProps {
    /**
     * The base path for the application. This is prepended to all locations
     */
    basename?: string;
    /**
     * Nested {@link Route} elements describing the route tree
     */
    children?: React.ReactNode;
    /**
     * The location to match against. Defaults to the current location.
     * This can be a string or a {@link Location} object.
     */
    location: Partial<Location> | string;
    /**
     * The type of navigation that triggered this `location` change.
     * Defaults to {@link NavigationType.Pop}.
     */
    navigationType?: Action;
    /**
     * The navigator to use for navigation. This is usually a history object
     * or a custom navigator that implements the {@link Navigator} interface.
     */
    navigator: Navigator;
    /**
     * Whether this router is static or not (used for SSR). If `true`, the router
     * will not be reactive to location changes.
     */
    static?: boolean;
}
/**
 * Provides location context for the rest of the app.
 *
 * Note: You usually won't render a `<Router>` directly. Instead, you'll render a
 * router that is more specific to your environment such as a {@link BrowserRouter}
 * in web browsers or a {@link ServerRouter} for server rendering.
 *
 * @public
 * @category Declarative Routers
 * @mode declarative
 * @param props Props
 * @param {RouterProps.basename} props.basename n/a
 * @param {RouterProps.children} props.children n/a
 * @param {RouterProps.location} props.location n/a
 * @param {RouterProps.navigationType} props.navigationType n/a
 * @param {RouterProps.navigator} props.navigator n/a
 * @param {RouterProps.static} props.static n/a
 * @returns React element for the rendered router or `null` if the location does
 * not match the {@link props.basename}
 */
declare function Router({ basename: basenameProp, children, location: locationProp, navigationType, navigator, static: staticProp, }: RouterProps): React.ReactElement | null;
/**
 * @category Types
 */
interface RoutesProps {
    /**
     * Nested {@link Route} elements
     */
    children?: React.ReactNode;
    /**
     * The {@link Location} to match against. Defaults to the current location.
     */
    location?: Partial<Location> | string;
}
/**
 * Renders a branch of {@link Route | `<Route>`s} that best matches the current
 * location. Note that these routes do not participate in [data loading](../../start/framework/route-module#loader),
 * [`action`](../../start/framework/route-module#action), code splitting, or
 * any other [route module](../../start/framework/route-module) features.
 *
 * @example
 * import { Route, Routes } from "react-router";
 *
 * <Routes>
 *   <Route index element={<StepOne />} />
 *   <Route path="step-2" element={<StepTwo />} />
 *   <Route path="step-3" element={<StepThree />}>
 * </Routes>
 *
 * @public
 * @category Components
 * @param props Props
 * @param {RoutesProps.children} props.children n/a
 * @param {RoutesProps.location} props.location n/a
 * @returns React element for the rendered routes or `null` if no route matches
 */
declare function Routes({ children, location, }: RoutesProps): React.ReactElement | null;
interface AwaitResolveRenderFunction<Resolve = any> {
    (data: Awaited<Resolve>): React.ReactNode;
}
/**
 * @category Types
 */
interface AwaitProps<Resolve> {
    /**
     * When using a function, the resolved value is provided as the parameter.
     *
     * ```tsx [2]
     * <Await resolve={reviewsPromise}>
     *   {(resolvedReviews) => <Reviews items={resolvedReviews} />}
     * </Await>
     * ```
     *
     * When using React elements, {@link useAsyncValue} will provide the
     * resolved value:
     *
     * ```tsx [2]
     * <Await resolve={reviewsPromise}>
     *   <Reviews />
     * </Await>
     *
     * function Reviews() {
     *   const resolvedReviews = useAsyncValue();
     *   return <div>...</div>;
     * }
     * ```
     */
    children: React.ReactNode | AwaitResolveRenderFunction<Resolve>;
    /**
     * The error element renders instead of the `children` when the [`Promise`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
     * rejects.
     *
     * ```tsx
     * <Await
     *   errorElement={<div>Oops</div>}
     *   resolve={reviewsPromise}
     * >
     *   <Reviews />
     * </Await>
     * ```
     *
     * To provide a more contextual error, you can use the {@link useAsyncError} in a
     * child component
     *
     * ```tsx
     * <Await
     *   errorElement={<ReviewsError />}
     *   resolve={reviewsPromise}
     * >
     *   <Reviews />
     * </Await>
     *
     * function ReviewsError() {
     *   const error = useAsyncError();
     *   return <div>Error loading reviews: {error.message}</div>;
     * }
     * ```
     *
     * If you do not provide an `errorElement`, the rejected value will bubble up
     * to the nearest route-level [`ErrorBoundary`](../../start/framework/route-module#errorboundary)
     * and be accessible via the {@link useRouteError} hook.
     */
    errorElement?: React.ReactNode;
    /**
     * Takes a [`Promise`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
     * returned from a [`loader`](../../start/framework/route-module#loader) to be
     * resolved and rendered.
     *
     * ```tsx
     * import { Await, useLoaderData } from "react-router";
     *
     * export async function loader() {
     *   let reviews = getReviews(); // not awaited
     *   let book = await getBook();
     *   return {
     *     book,
     *     reviews, // this is a promise
     *   };
     * }
     *
     * export default function Book() {
     *   const {
     *     book,
     *     reviews, // this is the same promise
     *   } = useLoaderData();
     *
     *   return (
     *     <div>
     *       <h1>{book.title}</h1>
     *       <p>{book.description}</p>
     *       <React.Suspense fallback={<ReviewsSkeleton />}>
     *         <Await
     *           // and is the promise we pass to Await
     *           resolve={reviews}
     *         >
     *           <Reviews />
     *         </Await>
     *       </React.Suspense>
     *     </div>
     *   );
     * }
     * ```
     */
    resolve: Resolve;
}
/**
 * Used to render promise values with automatic error handling.
 *
 * **Note:** `<Await>` expects to be rendered inside a [`<React.Suspense>`](https://react.dev/reference/react/Suspense)
 *
 * @example
 * import { Await, useLoaderData } from "react-router";
 *
 * export async function loader() {
 *   // not awaited
 *   const reviews = getReviews();
 *   // awaited (blocks the transition)
 *   const book = await fetch("/api/book").then((res) => res.json());
 *   return { book, reviews };
 * }
 *
 * function Book() {
 *   const { book, reviews } = useLoaderData();
 *   return (
 *     <div>
 *       <h1>{book.title}</h1>
 *       <p>{book.description}</p>
 *       <React.Suspense fallback={<ReviewsSkeleton />}>
 *         <Await
 *           resolve={reviews}
 *           errorElement={
 *             <div>Could not load reviews 😬</div>
 *           }
 *           children={(resolvedReviews) => (
 *             <Reviews items={resolvedReviews} />
 *           )}
 *         />
 *       </React.Suspense>
 *     </div>
 *   );
 * }
 *
 * @public
 * @category Components
 * @mode framework
 * @mode data
 * @param props Props
 * @param {AwaitProps.children} props.children n/a
 * @param {AwaitProps.errorElement} props.errorElement n/a
 * @param {AwaitProps.resolve} props.resolve n/a
 * @returns React element for the rendered awaited value
 */
declare function Await<Resolve>({ children, errorElement, resolve, }: AwaitProps<Resolve>): React.JSX.Element;
/**
 * Creates a route config from a React "children" object, which is usually
 * either a `<Route>` element or an array of them. Used internally by
 * `<Routes>` to create a route config from its children.
 *
 * @category Utils
 * @mode data
 * @param children The React children to convert into a route config
 * @param parentPath The path of the parent route, used to generate unique IDs.
 * @returns An array of {@link RouteObject}s that can be used with a {@link DataRouter}
 */
declare function createRoutesFromChildren(children: React.ReactNode, parentPath?: number[]): RouteObject[];
/**
 * Create route objects from JSX elements instead of arrays of objects.
 *
 * @example
 * const routes = createRoutesFromElements(
 *   <>
 *     <Route index loader={step1Loader} Component={StepOne} />
 *     <Route path="step-2" loader={step2Loader} Component={StepTwo} />
 *     <Route path="step-3" loader={step3Loader} Component={StepThree} />
 *   </>
 * );
 *
 * const router = createBrowserRouter(routes);
 *
 * function App() {
 *   return <RouterProvider router={router} />;
 * }
 *
 * @name createRoutesFromElements
 * @public
 * @category Utils
 * @mode data
 * @param children The React children to convert into a route config
 * @param parentPath The path of the parent route, used to generate unique IDs.
 * This is used for internal recursion and is not intended to be used by the
 * application developer.
 * @returns An array of {@link RouteObject}s that can be used with a {@link DataRouter}
 */
declare const createRoutesFromElements: typeof createRoutesFromChildren;
/**
 * Renders the result of {@link matchRoutes} into a React element.
 *
 * @public
 * @category Utils
 * @param matches The array of {@link RouteMatch | route matches} to render
 * @returns A React element that renders the matched routes or `null` if no matches
 */
declare function renderMatches(matches: RouteMatch[] | null): React.ReactElement | null;
declare function useRouteComponentProps(): {
    params: Readonly<Params<string>>;
    loaderData: any;
    actionData: any;
    matches: UIMatch<unknown, unknown>[];
};
type RouteComponentProps = ReturnType<typeof useRouteComponentProps>;
type RouteComponentType = React.ComponentType<RouteComponentProps>;
declare function WithComponentProps({ children, }: {
    children: React.ReactElement;
}): React.ReactElement<any, string | React.JSXElementConstructor<any>>;
declare function withComponentProps(Component: RouteComponentType): () => React.ReactElement<{
    params: Readonly<Params<string>>;
    loaderData: any;
    actionData: any;
    matches: UIMatch<unknown, unknown>[];
}, string | React.JSXElementConstructor<any>>;
declare function useHydrateFallbackProps(): {
    params: Readonly<Params<string>>;
    loaderData: any;
    actionData: any;
};
type HydrateFallbackProps = ReturnType<typeof useHydrateFallbackProps>;
type HydrateFallbackType = React.ComponentType<HydrateFallbackProps>;
declare function WithHydrateFallbackProps({ children, }: {
    children: React.ReactElement;
}): React.ReactElement<any, string | React.JSXElementConstructor<any>>;
declare function withHydrateFallbackProps(HydrateFallback: HydrateFallbackType): () => React.ReactElement<{
    params: Readonly<Params<string>>;
    loaderData: any;
    actionData: any;
}, string | React.JSXElementConstructor<any>>;
declare function useErrorBoundaryProps(): {
    params: Readonly<Params<string>>;
    loaderData: any;
    actionData: any;
    error: unknown;
};
type ErrorBoundaryProps = ReturnType<typeof useErrorBoundaryProps>;
type ErrorBoundaryType = React.ComponentType<ErrorBoundaryProps>;
declare function WithErrorBoundaryProps({ children, }: {
    children: React.ReactElement;
}): React.ReactElement<any, string | React.JSXElementConstructor<any>>;
declare function withErrorBoundaryProps(ErrorBoundary: ErrorBoundaryType): () => React.ReactElement<{
    params: Readonly<Params<string>>;
    loaderData: any;
    actionData: any;
    error: unknown;
}, string | React.JSXElementConstructor<any>>;

type ParamKeyValuePair = [string, string];
type URLSearchParamsInit = string | ParamKeyValuePair[] | Record<string, string | string[]> | URLSearchParams;
/**
  Creates a URLSearchParams object using the given initializer.

  This is identical to `new URLSearchParams(init)` except it also
  supports arrays as values in the object form of the initializer
  instead of just strings. This is convenient when you need multiple
  values for a given key, but don't want to use an array initializer.

  For example, instead of:

  ```tsx
  let searchParams = new URLSearchParams([
    ['sort', 'name'],
    ['sort', 'price']
  ]);
  ```
  you can do:

  ```
  let searchParams = createSearchParams({
    sort: ['name', 'price']
  });
  ```

  @category Utils
 */
declare function createSearchParams(init?: URLSearchParamsInit): URLSearchParams;
type JsonObject = {
    [Key in string]: JsonValue;
} & {
    [Key in string]?: JsonValue | undefined;
};
type JsonArray = JsonValue[] | readonly JsonValue[];
type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonArray;
type SubmitTarget = HTMLFormElement | HTMLButtonElement | HTMLInputElement | FormData | URLSearchParams | JsonValue | null;
/**
 * Submit options shared by both navigations and fetchers
 */
interface SharedSubmitOptions {
    /**
     * The HTTP method used to submit the form. Overrides `<form method>`.
     * Defaults to "GET".
     */
    method?: HTMLFormMethod;
    /**
     * The action URL path used to submit the form. Overrides `<form action>`.
     * Defaults to the path of the current route.
     */
    action?: string;
    /**
     * The encoding used to submit the form. Overrides `<form encType>`.
     * Defaults to "application/x-www-form-urlencoded".
     */
    encType?: FormEncType;
    /**
     * Determines whether the form action is relative to the route hierarchy or
     * the pathname.  Use this if you want to opt out of navigating the route
     * hierarchy and want to instead route based on /-delimited URL segments
     */
    relative?: RelativeRoutingType;
    /**
     * In browser-based environments, prevent resetting scroll after this
     * navigation when using the <ScrollRestoration> component
     */
    preventScrollReset?: boolean;
    /**
     * Enable flushSync for this submission's state updates
     */
    flushSync?: boolean;
}
/**
 * Submit options available to fetchers
 */
interface FetcherSubmitOptions extends SharedSubmitOptions {
}
/**
 * Submit options available to navigations
 */
interface SubmitOptions extends FetcherSubmitOptions {
    /**
     * Set `true` to replace the current entry in the browser's history stack
     * instead of creating a new one (i.e. stay on "the same page"). Defaults
     * to `false`.
     */
    replace?: boolean;
    /**
     * State object to add to the history stack entry for this navigation
     */
    state?: any;
    /**
     * Indicate a specific fetcherKey to use when using navigate=false
     */
    fetcherKey?: string;
    /**
     * navigate=false will use a fetcher instead of a navigation
     */
    navigate?: boolean;
    /**
     * Enable view transitions on this submission navigation
     */
    viewTransition?: boolean;
}

type ServerRouteManifest = RouteManifest<Omit<ServerRoute, "children">>;
interface ServerRoute extends Route {
    children: ServerRoute[];
    module: ServerRouteModule;
}

type OptionalCriticalCss = CriticalCss | undefined;
/**
 * The output of the compiler for the server build.
 */
interface ServerBuild {
    entry: {
        module: ServerEntryModule;
    };
    routes: ServerRouteManifest;
    assets: AssetsManifest;
    basename?: string;
    publicPath: string;
    assetsBuildDirectory: string;
    future: FutureConfig;
    ssr: boolean;
    unstable_getCriticalCss?: (args: {
        pathname: string;
    }) => OptionalCriticalCss | Promise<OptionalCriticalCss>;
    /**
     * @deprecated This is now done via a custom header during prerendering
     */
    isSpaMode: boolean;
    prerender: string[];
    routeDiscovery: {
        mode: "lazy" | "initial";
        manifestPath: string;
    };
}
interface HandleDocumentRequestFunction {
    (request: Request, responseStatusCode: number, responseHeaders: Headers, context: EntryContext, loadContext: MiddlewareEnabled extends true ? unstable_RouterContextProvider : AppLoadContext): Promise<Response> | Response;
}
interface HandleDataRequestFunction {
    (response: Response, args: LoaderFunctionArgs | ActionFunctionArgs): Promise<Response> | Response;
}
interface HandleErrorFunction {
    (error: unknown, args: LoaderFunctionArgs | ActionFunctionArgs): void;
}
/**
 * A module that serves as the entry point for a Remix app during server
 * rendering.
 */
interface ServerEntryModule {
    default: HandleDocumentRequestFunction;
    handleDataRequest?: HandleDataRequestFunction;
    handleError?: HandleErrorFunction;
    streamTimeout?: number;
}

interface Route {
    index?: boolean;
    caseSensitive?: boolean;
    id: string;
    parentId?: string;
    path?: string;
}
interface EntryRoute extends Route {
    hasAction: boolean;
    hasLoader: boolean;
    hasClientAction: boolean;
    hasClientLoader: boolean;
    hasClientMiddleware: boolean;
    hasErrorBoundary: boolean;
    imports?: string[];
    css?: string[];
    module: string;
    clientActionModule: string | undefined;
    clientLoaderModule: string | undefined;
    clientMiddlewareModule: string | undefined;
    hydrateFallbackModule: string | undefined;
    parentId?: string;
}
declare function createClientRoutesWithHMRRevalidationOptOut(needsRevalidation: Set<string>, manifest: RouteManifest<EntryRoute>, routeModulesCache: RouteModules, initialState: HydrationState, ssr: boolean, isSpaMode: boolean): DataRouteObject[];
declare function createClientRoutes(manifest: RouteManifest<EntryRoute>, routeModulesCache: RouteModules, initialState: HydrationState | null, ssr: boolean, isSpaMode: boolean, parentId?: string, routesByParentId?: Record<string, Omit<EntryRoute, "children">[]>, needsRevalidation?: Set<string>): DataRouteObject[];
declare function shouldHydrateRouteLoader(routeId: string, clientLoader: ClientLoaderFunction | undefined, hasLoader: boolean, isSpaMode: boolean): boolean;

type SerializedError = {
    message: string;
    stack?: string;
};
interface FrameworkContextObject {
    manifest: AssetsManifest;
    routeModules: RouteModules;
    criticalCss?: CriticalCss;
    serverHandoffString?: string;
    future: FutureConfig;
    ssr: boolean;
    isSpaMode: boolean;
    routeDiscovery: ServerBuild["routeDiscovery"];
    serializeError?(error: Error): SerializedError;
    renderMeta?: {
        didRenderScripts?: boolean;
        streamCache?: Record<number, Promise<void> & {
            result?: {
                done: boolean;
                value: string;
            };
            error?: unknown;
        }>;
    };
}
interface EntryContext extends FrameworkContextObject {
    staticHandlerContext: StaticHandlerContext;
    serverHandoffStream?: ReadableStream<Uint8Array>;
}
interface FutureConfig {
    unstable_subResourceIntegrity: boolean;
    unstable_middleware: boolean;
}
type CriticalCss = string | {
    rel: "stylesheet";
    href: string;
};
interface AssetsManifest {
    entry: {
        imports: string[];
        module: string;
    };
    routes: RouteManifest<EntryRoute>;
    url: string;
    version: string;
    hmr?: {
        timestamp?: number;
        runtime: string;
    };
    sri?: Record<string, string> | true;
}

declare const FrameworkContext: React.Context<FrameworkContextObject | undefined>;
/**
 * Defines the discovery behavior of the link:
 *
 * - "render" - default, discover the route when the link renders
 * - "none" - don't eagerly discover, only discover if the link is clicked
 */
type DiscoverBehavior = "render" | "none";
/**
 * Defines the prefetching behavior of the link:
 *
 * - "none": Never fetched
 * - "intent": Fetched when the user focuses or hovers the link
 * - "render": Fetched when the link is rendered
 * - "viewport": Fetched when the link is in the viewport
 */
type PrefetchBehavior = "intent" | "render" | "none" | "viewport";
/**
 * Props for the {@link Links} component.
 *
 * @category Types
 */
interface LinksProps {
    /**
     * A [`nonce`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/nonce)
     * attribute to render on the [`<link>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link)
     * element
     */
    nonce?: string | undefined;
}
/**
 * Renders all the [`<link>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link)
 * tags created by the route module's [`links`](../../start/framework/route-module#links)
 * export. You should render it inside the [`<head>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/head)
 * of your document.
 *
 * @example
 * import { Links } from "react-router";
 *
 * export default function Root() {
 *   return (
 *     <html>
 *       <head>
 *         <Links />
 *       </head>
 *       <body></body>
 *     </html>
 *   );
 * }
 *
 * @public
 * @category Components
 * @mode framework
 * @param props Props
 * @param {LinksProps.nonce} props.nonce n/a
 * @returns A collection of React elements for [`<link>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link)
 * tags
 */
declare function Links({ nonce }: LinksProps): React.JSX.Element;
/**
 * Renders [`<link rel=prefetch|modulepreload>`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLLinkElement/rel)
 * tags for modules and data of another page to enable an instant navigation to
 * that page. [`<Link prefetch>`](./Link#prefetch) uses this internally, but you
 * can render it to prefetch a page for any other reason.
 *
 * For example, you may render one of this as the user types into a search field
 * to prefetch search results before they click through to their selection.
 *
 * @example
 * import { PrefetchPageLinks } from "react-router";
 *
 * <PrefetchPageLinks page="/absolute/path" />
 *
 * @public
 * @category Components
 * @mode framework
 * @param props Props
 * @param {PageLinkDescriptor.page} props.page n/a
 * @param props.linkProps Additional props to spread onto the [`<link>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link)
 * tags, such as [`crossOrigin`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLLinkElement/crossOrigin),
 * [`integrity`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLLinkElement/integrity),
 * [`rel`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLLinkElement/rel),
 * etc.
 * @returns A collection of React elements for [`<link>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link)
 * tags
 */
declare function PrefetchPageLinks({ page, ...linkProps }: PageLinkDescriptor): React.JSX.Element | null;
/**
 * Renders all the [`<meta>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta)
 * tags created by the route module's [`meta`](../../start/framework/route-module#meta)
 * export. You should render it inside the [`<head>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/head)
 * of your document.
 *
 * @example
 * import { Meta } from "react-router";
 *
 * export default function Root() {
 *   return (
 *     <html>
 *       <head>
 *         <Meta />
 *       </head>
 *     </html>
 *   );
 * }
 *
 * @public
 * @category Components
 * @mode framework
 * @returns A collection of React elements for [`<meta>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta)
 * tags
 */
declare function Meta(): React.JSX.Element;
/**
 * A couple common attributes:
 *
 * - `<Scripts crossOrigin>` for hosting your static assets on a different
 *   server than your app.
 * - `<Scripts nonce>` to support a [content security policy for scripts](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/script-src)
 * with [nonce-sources](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/Sources#sources)
 * for your [`<script>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script)
 * tags.
 *
 * You cannot pass through attributes such as [`async`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLScriptElement/async),
 * [`defer`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLScriptElement/defer),
 * [`noModule`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLScriptElement/noModule),
 * [`src`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLScriptElement/src),
 * or [`type`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLScriptElement/type),
 * because they are managed by React Router internally.
 *
 * @category Types
 */
type ScriptsProps = Omit<React.HTMLProps<HTMLScriptElement>, "async" | "children" | "dangerouslySetInnerHTML" | "defer" | "noModule" | "src" | "suppressHydrationWarning" | "type"> & {
    /**
     * A [`nonce`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/nonce)
     * attribute to render on the [`<script>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script)
     * element
     */
    nonce?: string | undefined;
};
/**
 * Renders the client runtime of your app. It should be rendered inside the
 * [`<body>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/body)
 *  of the document.
 *
 * If server rendering, you can omit `<Scripts/>` and the app will work as a
 * traditional web app without JavaScript, relying solely on HTML and browser
 * behaviors.
 *
 * @example
 * import { Scripts } from "react-router";
 *
 * export default function Root() {
 *   return (
 *     <html>
 *       <head />
 *       <body>
 *         <Scripts />
 *       </body>
 *     </html>
 *   );
 * }
 *
 * @public
 * @category Components
 * @mode framework
 * @param scriptProps Additional props to spread onto the [`<script>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script)
 * tags, such as [`crossOrigin`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLScriptElement/crossOrigin),
 * [`nonce`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/nonce),
 * etc.
 * @returns A collection of React elements for [`<script>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script)
 * tags
 */
declare function Scripts(scriptProps: ScriptsProps): React.JSX.Element | null;

/**
 * @category Data Routers
 */
interface DOMRouterOpts {
    /**
     * Basename path for the application.
     */
    basename?: string;
    /**
     * A function that returns an {@link unstable_RouterContextProvider} instance
     * which is provided as the `context` argument to client [`action`](../../start/data/route-object#action)s,
     * [`loader`](../../start/data/route-object#loader)s and [middleware](../../how-to/middleware).
     * This function is called to generate a fresh `context` instance on each
     * navigation or fetcher call.
     *
     * ```tsx
     * import {
     *   unstable_createContext,
     *   unstable_RouterContextProvider,
     * } from "react-router";
     *
     * const apiClientContext = unstable_createContext<APIClient>();
     *
     * function createBrowserRouter(routes, {
     *   unstable_getContext() {
     *     let context = new unstable_RouterContextProvider();
     *     context.set(apiClientContext, getApiClient());
     *     return context;
     *   }
     * })
     * ```
     */
    unstable_getContext?: RouterInit["unstable_getContext"];
    /**
     * Future flags to enable for the router.
     */
    future?: Partial<FutureConfig$1>;
    /**
     * When Server-Rendering and opting-out of automatic hydration, the
     * `hydrationData` option allows you to pass in hydration data from your
     * server-render. This will almost always be a subset of data from the
     * {@link StaticHandlerContext} value you get back from the {@link StaticHandler}'s
     * `query` method:
     *
     * ```tsx
     * const router = createBrowserRouter(routes, {
     *   hydrationData: {
     *     loaderData: {
     *       // [routeId]: serverLoaderData
     *     },
     *     // may also include `errors` and/or `actionData`
     *   },
     * });
     * ```
     *
     * **Partial Hydration Data**
     *
     * You will almost always include a complete set of `loaderData` to hydrate a
     * server-rendered app. But in advanced use-cases (such as Framework Mode's
     * [`clientLoader`](../../start/framework/route-module#clientLoader)), you may
     * want to include `loaderData` for only some routes that were loaded/rendered
     * on the server. This allows you to hydrate _some_ of the routes (such as the
     * app layout/shell) while showing a `HydrateFallback` component and running
     * the [`loader`](../../start/data/route-object#loader)s for other routes
     * during hydration.
     *
     * A route [`loader`](../../start/data/route-object#loader) will run during
     * hydration in two scenarios:
     *
     *  1. No hydration data is provided
     *     In these cases the `HydrateFallback` component will render on initial
     *     hydration
     *  2. The `loader.hydrate` property is set to `true`
     *     This allows you to run the [`loader`](../../start/data/route-object#loader)
     *     even if you did not render a fallback on initial hydration (i.e., to
     *     prime a cache with hydration data)
     *
     * ```tsx
     * const router = createBrowserRouter(
     *   [
     *     {
     *       id: "root",
     *       loader: rootLoader,
     *       Component: Root,
     *       children: [
     *         {
     *           id: "index",
     *           loader: indexLoader,
     *           HydrateFallback: IndexSkeleton,
     *           Component: Index,
     *         },
     *       ],
     *     },
     *   ],
     *   {
     *     hydrationData: {
     *       loaderData: {
     *         root: "ROOT DATA",
     *         // No index data provided
     *       },
     *     },
     *   }
     * );
     * ```
     */
    hydrationData?: HydrationState;
    /**
     * Override the default data strategy of running loaders in parallel.
     * See {@link DataStrategyFunction}.
     *
     * <docs-warning>This is a low-level API intended for advanced use-cases. This
     * overrides React Router's internal handling of
     * [`action`](../../start/data/route-object#action)/[`loader`](../../start/data/route-object#loader)
     * execution, and if done incorrectly will break your app code. Please use
     * with caution and perform the appropriate testing.</docs-warning>
     *
     * By default, React Router is opinionated about how your data is loaded/submitted -
     * and most notably, executes all of your [`loader`](../../start/data/route-object#loader)s
     * in parallel for optimal data fetching. While we think this is the right
     * behavior for most use-cases, we realize that there is no "one size fits all"
     * solution when it comes to data fetching for the wide landscape of
     * application requirements.
     *
     * The `dataStrategy` option gives you full control over how your [`action`](../../start/data/route-object#action)s
     * and [`loader`](../../start/data/route-object#loader)s are executed and lays
     * the foundation to build in more advanced APIs such as middleware, context,
     * and caching layers. Over time, we expect that we'll leverage this API
     * internally to bring more first class APIs to React Router, but until then
     * (and beyond), this is your way to add more advanced functionality for your
     * application's data needs.
     *
     * The `dataStrategy` function should return a key/value-object of
     * `routeId` -> {@link DataStrategyResult} and should include entries for any
     * routes where a handler was executed. A `DataStrategyResult` indicates if
     * the handler was successful or not based on the `DataStrategyResult.type`
     * field. If the returned `DataStrategyResult.result` is a [`Response`](https://developer.mozilla.org/en-US/docs/Web/API/Response),
     * React Router will unwrap it for you (via [`res.json`](https://developer.mozilla.org/en-US/docs/Web/API/Response/json)
     * or [`res.text`](https://developer.mozilla.org/en-US/docs/Web/API/Response/text)).
     * If you need to do custom decoding of a [`Response`](https://developer.mozilla.org/en-US/docs/Web/API/Response)
     * but want to preserve the status code, you can use the `data` utility to
     * return your decoded data along with a `ResponseInit`.
     *
     * <details>
     * <summary><b>Example <code>dataStrategy</code> Use Cases</b></summary>
     *
     * **Adding logging**
     *
     * In the simplest case, let's look at hooking into this API to add some logging
     * for when our route [`action`](../../start/data/route-object#action)s/[`loader`](../../start/data/route-object#loader)s
     * execute:
     *
     * ```tsx
     * let router = createBrowserRouter(routes, {
     *   async dataStrategy({ matches, request }) {
     *     const matchesToLoad = matches.filter((m) => m.shouldLoad);
     *     const results: Record<string, DataStrategyResult> = {};
     *     await Promise.all(
     *       matchesToLoad.map(async (match) => {
     *         console.log(`Processing ${match.route.id}`);
     *         results[match.route.id] = await match.resolve();;
     *       })
     *     );
     *     return results;
     *   },
     * });
     * ```
     *
     * **Middleware**
     *
     * Let's define a middleware on each route via [`handle`](../../start/data/route-object#handle)
     * and call middleware sequentially first, then call all
     * [`loader`](../../start/data/route-object#loader)s in parallel - providing
     * any data made available via the middleware:
     *
     * ```ts
     * const routes = [
     *   {
     *     id: "parent",
     *     path: "/parent",
     *     loader({ request }, context) {
     *        // ...
     *     },
     *     handle: {
     *       async middleware({ request }, context) {
     *         context.parent = "PARENT MIDDLEWARE";
     *       },
     *     },
     *     children: [
     *       {
     *         id: "child",
     *         path: "child",
     *         loader({ request }, context) {
     *           // ...
     *         },
     *         handle: {
     *           async middleware({ request }, context) {
     *             context.child = "CHILD MIDDLEWARE";
     *           },
     *         },
     *       },
     *     ],
     *   },
     * ];
     *
     * let router = createBrowserRouter(routes, {
     *   async dataStrategy({ matches, params, request }) {
     *     // Run middleware sequentially and let them add data to `context`
     *     let context = {};
     *     for (const match of matches) {
     *       if (match.route.handle?.middleware) {
     *         await match.route.handle.middleware(
     *           { request, params },
     *           context
     *         );
     *       }
     *     }
     *
     *     // Run loaders in parallel with the `context` value
     *     let matchesToLoad = matches.filter((m) => m.shouldLoad);
     *     let results = await Promise.all(
     *       matchesToLoad.map((match, i) =>
     *         match.resolve((handler) => {
     *           // Whatever you pass to `handler` will be passed as the 2nd parameter
     *           // to your loader/action
     *           return handler(context);
     *         })
     *       )
     *     );
     *     return results.reduce(
     *       (acc, result, i) =>
     *         Object.assign(acc, {
     *           [matchesToLoad[i].route.id]: result,
     *         }),
     *       {}
     *     );
     *   },
     * });
     * ```
     *
     * **Custom Handler**
     *
     * It's also possible you don't even want to define a [`loader`](../../start/data/route-object#loader)
     * implementation at the route level. Maybe you want to just determine the
     * routes and issue a single GraphQL request for all of your data? You can do
     * that by setting your `route.loader=true` so it qualifies as "having a
     * loader", and then store GQL fragments on `route.handle`:
     *
     * ```ts
     * const routes = [
     *   {
     *     id: "parent",
     *     path: "/parent",
     *     loader: true,
     *     handle: {
     *       gql: gql`
     *         fragment Parent on Whatever {
     *           parentField
     *         }
     *       `,
     *     },
     *     children: [
     *       {
     *         id: "child",
     *         path: "child",
     *         loader: true,
     *         handle: {
     *           gql: gql`
     *             fragment Child on Whatever {
     *               childField
     *             }
     *           `,
     *         },
     *       },
     *     ],
     *   },
     * ];
     *
     * let router = createBrowserRouter(routes, {
     *   async dataStrategy({ matches, params, request }) {
     *     // Compose route fragments into a single GQL payload
     *     let gql = getFragmentsFromRouteHandles(matches);
     *     let data = await fetchGql(gql);
     *     // Parse results back out into individual route level `DataStrategyResult`'s
     *     // keyed by `routeId`
     *     let results = parseResultsFromGql(data);
     *     return results;
     *   },
     * });
     * ```
     *</details>
     */
    dataStrategy?: DataStrategyFunction;
    /**
     * Lazily define portions of the route tree on navigations.
     * See {@link PatchRoutesOnNavigationFunction}.
     *
     * By default, React Router wants you to provide a full route tree up front via
     * `createBrowserRouter(routes)`. This allows React Router to perform synchronous
     * route matching, execute loaders, and then render route components in the most
     * optimistic manner without introducing waterfalls. The tradeoff is that your
     * initial JS bundle is larger by definition — which may slow down application
     * start-up times as your application grows.
     *
     * To combat this, we introduced [`route.lazy`](../../start/data/route-object#lazy)
     * in [v6.9.0](https://github.com/remix-run/react-router/blob/main/CHANGELOG.md#v690)
     * which lets you lazily load the route _implementation_ ([`loader`](../../start/data/route-object#loader),
     * [`Component`](../../start/data/route-object#Component), etc.) while still
     * providing the route _definition_ aspects up front (`path`, `index`, etc.).
     * This is a good middle ground. React Router still knows about your route
     * definitions (the lightweight part) up front and can perform synchronous
     * route matching, but then delay loading any of the route implementation
     * aspects (the heavier part) until the route is actually navigated to.
     *
     * In some cases, even this doesn't go far enough. For huge applications,
     * providing all route definitions up front can be prohibitively expensive.
     * Additionally, it might not even be possible to provide all route definitions
     * up front in certain Micro-Frontend or Module-Federation architectures.
     *
     * This is where `patchRoutesOnNavigation` comes in ([RFC](https://github.com/remix-run/react-router/discussions/11113)).
     * This API is for advanced use-cases where you are unable to provide the full
     * route tree up-front and need a way to lazily "discover" portions of the route
     * tree at runtime. This feature is often referred to as ["Fog of War"](https://en.wikipedia.org/wiki/Fog_of_war),
     * because similar to how video games expand the "world" as you move around -
     * the router would be expanding its routing tree as the user navigated around
     * the app - but would only ever end up loading portions of the tree that the
     * user visited.
     *
     * `patchRoutesOnNavigation` will be called anytime React Router is unable to
     * match a `path`. The arguments include the `path`, any partial `matches`,
     * and a `patch` function you can call to patch new routes into the tree at a
     * specific location. This method is executed during the `loading` portion of
     * the navigation for `GET` requests and during the `submitting` portion of
     * the navigation for non-`GET` requests.
     *
     * <details>
     *   <summary><b>Example <code>patchRoutesOnNavigation</code> Use Cases</b></summary>
     *
     *   **Patching children into an existing route**
     *
     *   ```tsx
     *   const router = createBrowserRouter(
     *     [
     *       {
     *         id: "root",
     *         path: "/",
     *         Component: RootComponent,
     *       },
     *     ],
     *     {
     *       async patchRoutesOnNavigation({ patch, path }) {
     *         if (path === "/a") {
     *           // Load/patch the `a` route as a child of the route with id `root`
     *           let route = await getARoute();
     *           //  ^ { path: 'a', Component: A }
     *           patch("root", [route]);
     *         }
     *       },
     *     }
     *   );
     *   ```
     *
     *   In the above example, if the user clicks a link to `/a`, React Router
     *   won't match any routes initially and will call `patchRoutesOnNavigation`
     *   with a `path = "/a"` and a `matches` array containing the root route
     *   match. By calling `patch('root', [route])`, the new route will be added
     *   to the route tree as a child of the `root` route and React Router will
     *   perform matching on the updated routes. This time it will successfully
     *   match the `/a` path and the navigation will complete successfully.
     *
     *   **Patching new root-level routes**
     *
     *   If you need to patch a new route to the top of the tree (i.e., it doesn't
     *   have a parent), you can pass `null` as the `routeId`:
     *
     *   ```tsx
     *   const router = createBrowserRouter(
     *     [
     *       {
     *         id: "root",
     *         path: "/",
     *         Component: RootComponent,
     *       },
     *     ],
     *     {
     *       async patchRoutesOnNavigation({ patch, path }) {
     *         if (path === "/root-sibling") {
     *           // Load/patch the `/root-sibling` route as a sibling of the root route
     *           let route = await getRootSiblingRoute();
     *           //  ^ { path: '/root-sibling', Component: RootSibling }
     *           patch(null, [route]);
     *         }
     *       },
     *     }
     *   );
     *   ```
     *
     *   **Patching subtrees asynchronously**
     *
     *   You can also perform asynchronous matching to lazily fetch entire sections
     *   of your application:
     *
     *   ```tsx
     *   let router = createBrowserRouter(
     *     [
     *       {
     *         path: "/",
     *         Component: Home,
     *       },
     *     ],
     *     {
     *       async patchRoutesOnNavigation({ patch, path }) {
     *         if (path.startsWith("/dashboard")) {
     *           let children = await import("./dashboard");
     *           patch(null, children);
     *         }
     *         if (path.startsWith("/account")) {
     *           let children = await import("./account");
     *           patch(null, children);
     *         }
     *       },
     *     }
     *   );
     *   ```
     *
     *   <docs-info>If in-progress execution of `patchRoutesOnNavigation` is
     *   interrupted by a later navigation, then any remaining `patch` calls in
     *   the interrupted execution will not update the route tree because the
     *   operation was cancelled.</docs-info>
     *
     *   **Co-locating route discovery with route definition**
     *
     *   If you don't wish to perform your own pseudo-matching, you can leverage
     *   the partial `matches` array and the [`handle`](../../start/data/route-object#handle)
     *   field on a route to keep the children definitions co-located:
     *
     *   ```tsx
     *   let router = createBrowserRouter(
     *     [
     *       {
     *         path: "/",
     *         Component: Home,
     *       },
     *       {
     *         path: "/dashboard",
     *         children: [
     *           {
     *             // If we want to include /dashboard in the critical routes, we need to
     *             // also include it's index route since patchRoutesOnNavigation will not be
     *             // called on a navigation to `/dashboard` because it will have successfully
     *             // matched the `/dashboard` parent route
     *             index: true,
     *             // ...
     *           },
     *         ],
     *         handle: {
     *           lazyChildren: () => import("./dashboard"),
     *         },
     *       },
     *       {
     *         path: "/account",
     *         children: [
     *           {
     *             index: true,
     *             // ...
     *           },
     *         ],
     *         handle: {
     *           lazyChildren: () => import("./account"),
     *         },
     *       },
     *     ],
     *     {
     *       async patchRoutesOnNavigation({ matches, patch }) {
     *         let leafRoute = matches[matches.length - 1]?.route;
     *         if (leafRoute?.handle?.lazyChildren) {
     *           let children =
     *             await leafRoute.handle.lazyChildren();
     *           patch(leafRoute.id, children);
     *         }
     *       },
     *     }
     *   );
     *   ```
     *
     *   **A note on routes with parameters**
     *
     *   Because React Router uses ranked routes to find the best match for a
     *   given path, there is an interesting ambiguity introduced when only a
     *   partial route tree is known at any given point in time. If we match a
     *   fully static route such as `path: "/about/contact-us"` then we know we've
     *   found the right match since it's composed entirely of static URL segments.
     *   Thus, we do not need to bother asking for any other potentially
     *   higher-scoring routes.
     *
     *   However, routes with parameters (dynamic or splat) can't make this
     *   assumption because there might be a not-yet-discovered route that scores
     *   higher. Consider a full route tree such as:
     *
     *   ```tsx
     *   // Assume this is the full route tree for your app
     *   const routes = [
     *     {
     *       path: "/",
     *       Component: Home,
     *     },
     *     {
     *       id: "blog",
     *       path: "/blog",
     *       Component: BlogLayout,
     *       children: [
     *         { path: "new", Component: NewPost },
     *         { path: ":slug", Component: BlogPost },
     *       ],
     *     },
     *   ];
     *   ```
     *
     *   And then assume we want to use `patchRoutesOnNavigation` to fill this in
     *   as the user navigates around:
     *
     *   ```tsx
     *   // Start with only the index route
     *   const router = createBrowserRouter(
     *     [
     *       {
     *         path: "/",
     *         Component: Home,
     *       },
     *     ],
     *     {
     *       async patchRoutesOnNavigation({ patch, path }) {
     *         if (path === "/blog/new") {
     *           patch("blog", [
     *             {
     *               path: "new",
     *               Component: NewPost,
     *             },
     *           ]);
     *         } else if (path.startsWith("/blog")) {
     *           patch("blog", [
     *             {
     *               path: ":slug",
     *               Component: BlogPost,
     *             },
     *           ]);
     *         }
     *       },
     *     }
     *   );
     *   ```
     *
     *   If the user were to a blog post first (i.e., `/blog/my-post`) we would
     *   patch in the `:slug` route. Then, if the user navigated to `/blog/new` to
     *   write a new post, we'd match `/blog/:slug` but it wouldn't be the _right_
     *   match! We need to call `patchRoutesOnNavigation` just in case there
     *   exists a higher-scoring route we've not yet discovered, which in this
     *   case there is.
     *
     *   So, anytime React Router matches a path that contains at least one param,
     *   it will call `patchRoutesOnNavigation` and match routes again just to
     *   confirm it has found the best match.
     *
     *   If your `patchRoutesOnNavigation` implementation is expensive or making
     *   side effect [`fetch`](https://developer.mozilla.org/en-US/docs/Web/API/fetch)
     *   calls to a backend server, you may want to consider tracking previously
     *   seen routes to avoid over-fetching in cases where you know the proper
     *   route has already been found. This can usually be as simple as
     *   maintaining a small cache of prior `path` values for which you've already
     *   patched in the right routes:
     *
     *   ```tsx
     *   let discoveredRoutes = new Set();
     *
     *   const router = createBrowserRouter(routes, {
     *     async patchRoutesOnNavigation({ patch, path }) {
     *       if (discoveredRoutes.has(path)) {
     *         // We've seen this before so nothing to patch in and we can let the router
     *         // use the routes it already knows about
     *         return;
     *       }
     *
     *       discoveredRoutes.add(path);
     *
     *       // ... patch routes in accordingly
     *     },
     *   });
     *   ```
     * </details>
     */
    patchRoutesOnNavigation?: PatchRoutesOnNavigationFunction;
    /**
     * [`Window`](https://developer.mozilla.org/en-US/docs/Web/API/Window) object
     * override. Defaults to the global `window` instance.
     */
    window?: Window;
}
/**
 * Create a new {@link DataRouter| data router} that manages the application
 * path via [`history.pushState`](https://developer.mozilla.org/en-US/docs/Web/API/History/pushState)
 * and [`history.replaceState`](https://developer.mozilla.org/en-US/docs/Web/API/History/replaceState).
 *
 * @public
 * @category Data Routers
 * @mode data
 * @param routes Application routes
 * @param opts Options
 * @param {DOMRouterOpts.basename} opts.basename n/a
 * @param {DOMRouterOpts.dataStrategy} opts.dataStrategy n/a
 * @param {DOMRouterOpts.future} opts.future n/a
 * @param {DOMRouterOpts.unstable_getContext} opts.unstable_getContext n/a
 * @param {DOMRouterOpts.hydrationData} opts.hydrationData n/a
 * @param {DOMRouterOpts.patchRoutesOnNavigation} opts.patchRoutesOnNavigation n/a
 * @param {DOMRouterOpts.window} opts.window n/a
 * @returns An initialized {@link DataRouter| data router} to pass to {@link RouterProvider | `<RouterProvider>`}
 */
declare function createBrowserRouter(routes: RouteObject[], opts?: DOMRouterOpts): Router$1;
/**
 * Create a new {@link DataRouter| data router} that manages the application
 * path via the URL [`hash`]https://developer.mozilla.org/en-US/docs/Web/API/URL/hash).
 *
 * @public
 * @category Data Routers
 * @mode data
 * @param routes Application routes
 * @param opts Options
 * @param {DOMRouterOpts.basename} opts.basename n/a
 * @param {DOMRouterOpts.future} opts.future n/a
 * @param {DOMRouterOpts.unstable_getContext} opts.unstable_getContext n/a
 * @param {DOMRouterOpts.hydrationData} opts.hydrationData n/a
 * @param {DOMRouterOpts.dataStrategy} opts.dataStrategy n/a
 * @param {DOMRouterOpts.patchRoutesOnNavigation} opts.patchRoutesOnNavigation n/a
 * @param {DOMRouterOpts.window} opts.window n/a
 * @returns An initialized {@link DataRouter| data router} to pass to {@link RouterProvider | `<RouterProvider>`}
 */
declare function createHashRouter(routes: RouteObject[], opts?: DOMRouterOpts): Router$1;
/**
 * @category Types
 */
interface BrowserRouterProps {
    /**
     * Application basename
     */
    basename?: string;
    /**
     * {@link Route | `<Route>`} components describing your route configuration
     */
    children?: React.ReactNode;
    /**
     * [`Window`](https://developer.mozilla.org/en-US/docs/Web/API/Window) object
     * override. Defaults to the global `window` instance
     */
    window?: Window;
}
/**
 * A declarative {@link Router | `<Router>`} using the browser [`History`](https://developer.mozilla.org/en-US/docs/Web/API/History)
 * API for client-side routing.
 *
 * @public
 * @category Declarative Routers
 * @mode declarative
 * @param props Props
 * @param {BrowserRouterProps.basename} props.basename n/a
 * @param {BrowserRouterProps.children} props.children n/a
 * @param {BrowserRouterProps.window} props.window n/a
 * @returns A declarative {@link Router | `<Router>`} using the browser [`History`](https://developer.mozilla.org/en-US/docs/Web/API/History)
 * API for client-side routing.
 */
declare function BrowserRouter({ basename, children, window, }: BrowserRouterProps): React.JSX.Element;
/**
 * @category Types
 */
interface HashRouterProps {
    /**
     * Application basename
     */
    basename?: string;
    /**
     * {@link Route | `<Route>`} components describing your route configuration
     */
    children?: React.ReactNode;
    /**
     * [`Window`](https://developer.mozilla.org/en-US/docs/Web/API/Window) object
     * override. Defaults to the global `window` instance
     */
    window?: Window;
}
/**
 * A declarative {@link Router | `<Router>`} that stores the location in the
 * [`hash`](https://developer.mozilla.org/en-US/docs/Web/API/URL/hash) portion
 * of the URL so it is not sent to the server.
 *
 * @public
 * @category Declarative Routers
 * @mode declarative
 * @param props Props
 * @param {HashRouterProps.basename} props.basename n/a
 * @param {HashRouterProps.children} props.children n/a
 * @param {HashRouterProps.window} props.window n/a
 * @returns A declarative {@link Router | `<Router>`} using the URL [`hash`](https://developer.mozilla.org/en-US/docs/Web/API/URL/hash)
 * for client-side routing.
 */
declare function HashRouter({ basename, children, window }: HashRouterProps): React.JSX.Element;
/**
 * @category Types
 */
interface HistoryRouterProps {
    /**
     * Application basename
     */
    basename?: string;
    /**
     * {@link Route | `<Route>`} components describing your route configuration
     */
    children?: React.ReactNode;
    /**
     *  A {@link History} implementation for use by the router
     */
    history: History;
}
/**
 * A declarative {@link Router | `<Router>`} that accepts a pre-instantiated
 * `history` object.
 * It's important to note that using your own `history` object is highly discouraged
 * and may add two versions of the `history` library to your bundles unless you use
 * the same version of the `history` library that React Router uses internally.
 *
 * @name unstable_HistoryRouter
 * @public
 * @category Declarative Routers
 * @mode declarative
 * @param props Props
 * @param {HistoryRouterProps.basename} props.basename n/a
 * @param {HistoryRouterProps.children} props.children n/a
 * @param {HistoryRouterProps.history} props.history n/a
 * @returns A declarative {@link Router | `<Router>`} using the provided history
 * implementation for client-side routing.
 */
declare function HistoryRouter({ basename, children, history, }: HistoryRouterProps): React.JSX.Element;
declare namespace HistoryRouter {
    var displayName: string;
}
/**
 * @category Types
 */
interface LinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
    /**
     * Defines the link discovery behavior
     *
     * ```tsx
     * <Link /> // default ("render")
     * <Link discover="render" />
     * <Link discover="none" />
     * ```
     *
     * - **render** — default, discover the route when the link renders
     * - **none** — don't eagerly discover, only discover if the link is clicked
     */
    discover?: DiscoverBehavior;
    /**
     * Defines the data and module prefetching behavior for the link.
     *
     * ```tsx
     * <Link /> // default
     * <Link prefetch="none" />
     * <Link prefetch="intent" />
     * <Link prefetch="render" />
     * <Link prefetch="viewport" />
     * ```
     *
     * - **none** — default, no prefetching
     * - **intent** — prefetches when the user hovers or focuses the link
     * - **render** — prefetches when the link renders
     * - **viewport** — prefetches when the link is in the viewport, very useful for mobile
     *
     * Prefetching is done with HTML [`<link rel="prefetch">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link)
     * tags. They are inserted after the link.
     *
     * ```tsx
     * <a href="..." />
     * <a href="..." />
     * <link rel="prefetch" /> // might conditionally render
     * ```
     *
     * Because of this, if you are using `nav :last-child` you will need to use
     * `nav :last-of-type` so the styles don't conditionally fall off your last link
     * (and any other similar selectors).
     */
    prefetch?: PrefetchBehavior;
    /**
     * Will use document navigation instead of client side routing when the link is
     * clicked: the browser will handle the transition normally (as if it were an
     * [`<a href>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a)).
     *
     * ```tsx
     * <Link to="/logout" reloadDocument />
     * ```
     */
    reloadDocument?: boolean;
    /**
     * Replaces the current entry in the [`History`](https://developer.mozilla.org/en-US/docs/Web/API/History)
     * stack instead of pushing a new one onto it.
     *
     * ```tsx
     * <Link replace />
     * ```
     *
     * ```
     * # with a history stack like this
     * A -> B
     *
     * # normal link click pushes a new entry
     * A -> B -> C
     *
     * # but with `replace`, B is replaced by C
     * A -> C
     * ```
     */
    replace?: boolean;
    /**
     * Adds persistent client side routing state to the next location.
     *
     * ```tsx
     * <Link to="/somewhere/else" state={{ some: "value" }} />
     * ```
     *
     * The location state is accessed from the `location`.
     *
     * ```tsx
     * function SomeComp() {
     *   const location = useLocation();
     *   location.state; // { some: "value" }
     * }
     * ```
     *
     * This state is inaccessible on the server as it is implemented on top of
     * [`history.state`](https://developer.mozilla.org/en-US/docs/Web/API/History/state)
     */
    state?: any;
    /**
     * Prevents the scroll position from being reset to the top of the window when
     * the link is clicked and the app is using {@link ScrollRestoration}. This only
     * prevents new locations resetting scroll to the top, scroll position will be
     * restored for back/forward button navigation.
     *
     * ```tsx
     * <Link to="?tab=one" preventScrollReset />
     * ```
     */
    preventScrollReset?: boolean;
    /**
     * Defines the relative path behavior for the link.
     *
     * ```tsx
     * <Link to=".." /> // default: "route"
     * <Link relative="route" />
     * <Link relative="path" />
     * ```
     *
     * Consider a route hierarchy where a parent route pattern is `"blog"` and a child
     * route pattern is `"blog/:slug/edit"`.
     *
     * - **route** — default, resolves the link relative to the route pattern. In the
     * example above, a relative link of `"..."` will remove both `:slug/edit` segments
     * back to `"/blog"`.
     * - **path** — relative to the path so `"..."` will only remove one URL segment up
     * to `"/blog/:slug"`
     *
     * Note that index routes and layout routes do not have paths so they are not
     * included in the relative path calculation.
     */
    relative?: RelativeRoutingType;
    /**
     * Can be a string or a partial {@link Path}:
     *
     * ```tsx
     * <Link to="/some/path" />
     *
     * <Link
     *   to={{
     *     pathname: "/some/path",
     *     search: "?query=string",
     *     hash: "#hash",
     *   }}
     * />
     * ```
     */
    to: To;
    /**
     * Enables a [View Transition](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API)
     * for this navigation.
     *
     * ```jsx
     * <Link to={to} viewTransition>
     *   Click me
     * </Link>
     * ```
     *
     * To apply specific styles for the transition, see {@link useViewTransitionState}
     */
    viewTransition?: boolean;
}
/**
 * A progressively enhanced [`<a href>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a)
 * wrapper to enable navigation with client-side routing.
 *
 * @example
 * import { Link } from "react-router";
 *
 * <Link to="/dashboard">Dashboard</Link>;
 *
 * <Link
 *   to={{
 *     pathname: "/some/path",
 *     search: "?query=string",
 *     hash: "#hash",
 *   }}
 * />;
 *
 * @public
 * @category Components
 * @param {LinkProps.discover} props.discover [modes: framework] n/a
 * @param {LinkProps.prefetch} props.prefetch [modes: framework] n/a
 * @param {LinkProps.preventScrollReset} props.preventScrollReset [modes: framework, data] n/a
 * @param {LinkProps.relative} props.relative n/a
 * @param {LinkProps.reloadDocument} props.reloadDocument n/a
 * @param {LinkProps.replace} props.replace n/a
 * @param {LinkProps.state} props.state n/a
 * @param {LinkProps.to} props.to n/a
 * @param {LinkProps.viewTransition} props.viewTransition [modes: framework, data] n/a
 */
declare const Link: React.ForwardRefExoticComponent<LinkProps & React.RefAttributes<HTMLAnchorElement>>;
/**
 * The object passed to {@link NavLink} `children`, `className`, and `style` prop
 * callbacks to render and style the link based on its state.
 *
 * ```
 * // className
 * <NavLink
 *   to="/messages"
 *   className={({ isActive, isPending }) =>
 *     isPending ? "pending" : isActive ? "active" : ""
 *   }
 * >
 *   Messages
 * </NavLink>
 *
 * // style
 * <NavLink
 *   to="/messages"
 *   style={({ isActive, isPending }) => {
 *     return {
 *       fontWeight: isActive ? "bold" : "",
 *       color: isPending ? "red" : "black",
 *     }
 *   )}
 * />
 *
 * // children
 * <NavLink to="/tasks">
 *   {({ isActive, isPending }) => (
 *     <span className={isActive ? "active" : ""}>Tasks</span>
 *   )}
 * </NavLink>
 * ```
 *
 */
type NavLinkRenderProps = {
    /**
     * Indicates if the link's URL matches the current {@link Location}.
     */
    isActive: boolean;
    /**
     * Indicates if the pending {@link Location} matches the link's URL. Only
     * available in Framework/Data modes.
     */
    isPending: boolean;
    /**
     * Indicates if a view transition to the link's URL is in progress.
     * See {@link useViewTransitionState}
     */
    isTransitioning: boolean;
};
/**
 * @category Types
 */
interface NavLinkProps extends Omit<LinkProps, "className" | "style" | "children"> {
    /**
     *  Can be regular React children or a function that receives an object with the
     * `active` and `pending` states of the link.
     *
     *  ```tsx
     *  <NavLink to="/tasks">
     *    {({ isActive }) => (
     *      <span className={isActive ? "active" : ""}>Tasks</span>
     *    )}
     *  </NavLink>
     *  ```
     */
    children?: React.ReactNode | ((props: NavLinkRenderProps) => React.ReactNode);
    /**
     * Changes the matching logic to make it case-sensitive:
     *
     * | Link                                         | URL           | isActive |
     * | -------------------------------------------- | ------------- | -------- |
     * | `<NavLink to="/SpOnGe-bOB" />`               | `/sponge-bob` | true     |
     * | `<NavLink to="/SpOnGe-bOB" caseSensitive />` | `/sponge-bob` | false    |
     */
    caseSensitive?: boolean;
    /**
     * Classes are automatically applied to `NavLink` that correspond to the state.
     *
     * ```css
     * a.active {
     *   color: red;
     * }
     * a.pending {
     *   color: blue;
     * }
     * a.transitioning {
     *   view-transition-name: my-transition;
     * }
     * ```
     *
     * Or you can specify a function that receives {@link NavLinkRenderProps} and
     * returns the `className`:
     *
     * ```tsx
     * <NavLink className={({ isActive, isPending }) => (
     *   isActive ? "my-active-class" :
     *   isPending ? "my-pending-class" :
     *   ""
     * )} />
     * ```
     */
    className?: string | ((props: NavLinkRenderProps) => string | undefined);
    /**
     * Changes the matching logic for the `active` and `pending` states to only match
     * to the "end" of the {@link NavLinkProps.to}. If the URL is longer, it will no
     * longer be considered active.
     *
     * | Link                          | URL          | isActive |
     * | ----------------------------- | ------------ | -------- |
     * | `<NavLink to="/tasks" />`     | `/tasks`     | true     |
     * | `<NavLink to="/tasks" />`     | `/tasks/123` | true     |
     * | `<NavLink to="/tasks" end />` | `/tasks`     | true     |
     * | `<NavLink to="/tasks" end />` | `/tasks/123` | false    |
     *
     * `<NavLink to="/">` is an exceptional case because _every_ URL matches `/`.
     * To avoid this matching every single route by default, it effectively ignores
     * the `end` prop and only matches when you're at the root route.
     */
    end?: boolean;
    /**
     * Styles can also be applied dynamically via a function that receives
     * {@link NavLinkRenderProps} and returns the styles:
     *
     * ```tsx
     * <NavLink to="/tasks" style={{ color: "red" }} />
     * <NavLink to="/tasks" style={({ isActive, isPending }) => ({
     *   color:
     *     isActive ? "red" :
     *     isPending ? "blue" : "black"
     * })} />
     * ```
     */
    style?: React.CSSProperties | ((props: NavLinkRenderProps) => React.CSSProperties | undefined);
}
/**
 * Wraps {@link Link | `<Link>`} with additional props for styling active and
 * pending states.
 *
 * - Automatically applies classes to the link based on its `active` and `pending`
 * states, see {@link NavLinkProps.className}
 *   - Note that `pending` is only available with Framework and Data modes.
 * - Automatically applies `aria-current="page"` to the link when the link is active.
 * See [`aria-current`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-current)
 * on MDN.
 * - States are additionally available through the className, style, and children
 * render props. See {@link NavLinkRenderProps}.
 *
 * @example
 * <NavLink to="/message">Messages</NavLink>
 *
 * // Using render props
 * <NavLink
 *   to="/messages"
 *   className={({ isActive, isPending }) =>
 *     isPending ? "pending" : isActive ? "active" : ""
 *   }
 * >
 *   Messages
 * </NavLink>
 *
 * @public
 * @category Components
 * @param {NavLinkProps.caseSensitive} props.caseSensitive n/a
 * @param {NavLinkProps.children} props.children n/a
 * @param {NavLinkProps.className} props.className n/a
 * @param {NavLinkProps.discover} props.discover [modes: framework] n/a
 * @param {NavLinkProps.end} props.end n/a
 * @param {NavLinkProps.prefetch} props.prefetch [modes: framework] n/a
 * @param {NavLinkProps.preventScrollReset} props.preventScrollReset [modes: framework, data] n/a
 * @param {NavLinkProps.relative} props.relative n/a
 * @param {NavLinkProps.reloadDocument} props.reloadDocument n/a
 * @param {NavLinkProps.replace} props.replace n/a
 * @param {NavLinkProps.state} props.state n/a
 * @param {NavLinkProps.style} props.style n/a
 * @param {NavLinkProps.to} props.to n/a
 * @param {NavLinkProps.viewTransition} props.viewTransition [modes: framework, data] n/a
 */
declare const NavLink: React.ForwardRefExoticComponent<NavLinkProps & React.RefAttributes<HTMLAnchorElement>>;
/**
 * Form props shared by navigations and fetchers
 */
interface SharedFormProps extends React.FormHTMLAttributes<HTMLFormElement> {
    /**
     * The HTTP verb to use when the form is submitted. Supports `"delete"`,
     * `"get"`, `"patch"`, `"post"`, and `"put"`.
     *
     * Native [`<form>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/form)
     * only supports `"get"` and `"post"`, avoid the other verbs if you'd like to
     * support progressive enhancement
     */
    method?: HTMLFormMethod;
    /**
     * The encoding type to use for the form submission.
     *
     * ```tsx
     * <Form encType="application/x-www-form-urlencoded"/>  // Default
     * <Form encType="multipart/form-data"/>
     * <Form encType="text/plain"/>
     * ```
     */
    encType?: "application/x-www-form-urlencoded" | "multipart/form-data" | "text/plain";
    /**
     * The URL to submit the form data to. If `undefined`, this defaults to the
     * closest route in context.
     */
    action?: string;
    /**
     * Determines whether the form action is relative to the route hierarchy or
     * the pathname. Use this if you want to opt out of navigating the route
     * hierarchy and want to instead route based on slash-delimited URL segments.
     * See {@link RelativeRoutingType}.
     */
    relative?: RelativeRoutingType;
    /**
     * Prevent the scroll position from resetting to the top of the viewport on
     * completion of the navigation when using the
     * {@link ScrollRestoration | `<ScrollRestoration>`} component
     */
    preventScrollReset?: boolean;
    /**
     * A function to call when the form is submitted. If you call
     * [`event.preventDefault()`](https://developer.mozilla.org/en-US/docs/Web/API/Event/preventDefault)
     * then this form will not do anything.
     */
    onSubmit?: React.FormEventHandler<HTMLFormElement>;
}
/**
 * Form props available to fetchers
 * @category Types
 */
interface FetcherFormProps extends SharedFormProps {
}
/**
 * Form props available to navigations
 * @category Types
 */
interface FormProps extends SharedFormProps {
    /**
     * Defines the link discovery behavior. See {@link DiscoverBehavior}.
     *
     * ```tsx
     * <Link /> // default ("render")
     * <Link discover="render" />
     * <Link discover="none" />
     * ```
     *
     * - **render** — default, discover the route when the link renders
     * - **none** — don't eagerly discover, only discover if the link is clicked
     */
    discover?: DiscoverBehavior;
    /**
     * Indicates a specific fetcherKey to use when using `navigate={false}` so you
     * can pick up the fetcher's state in a different component in a {@link useFetcher}.
     */
    fetcherKey?: string;
    /**
     * When `false`, skips the navigation and submits via a fetcher internally.
     * This is essentially a shorthand for {@link useFetcher} + `<fetcher.Form>` where
     * you don't care about the resulting data in this component.
     */
    navigate?: boolean;
    /**
     * Forces a full document navigation instead of client side routing and data
     * fetch.
     */
    reloadDocument?: boolean;
    /**
     * Replaces the current entry in the browser [`History`](https://developer.mozilla.org/en-US/docs/Web/API/History)
     * stack when the form navigates. Use this if you don't want the user to be
     * able to click "back" to the page with the form on it.
     */
    replace?: boolean;
    /**
     * State object to add to the [`History`](https://developer.mozilla.org/en-US/docs/Web/API/History)
     * stack entry for this navigation
     */
    state?: any;
    /**
     * Enables a [View Transition](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API)
     * for this navigation. To apply specific styles during the transition, see
     * {@link useViewTransitionState}.
     */
    viewTransition?: boolean;
}
/**
 * A progressively enhanced HTML [`<form>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/form)
 * that submits data to actions via [`fetch`](https://developer.mozilla.org/en-US/docs/Web/API/fetch),
 * activating pending states in {@link useNavigation} which enables advanced
 * user interfaces beyond a basic HTML [`<form>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/form).
 * After a form's `action` completes, all data on the page is automatically
 * revalidated to keep the UI in sync with the data.
 *
 * Because it uses the HTML form API, server rendered pages are interactive at a
 * basic level before JavaScript loads. Instead of React Router managing the
 * submission, the browser manages the submission as well as the pending states
 * (like the spinning favicon). After JavaScript loads, React Router takes over
 * enabling web application user experiences.
 *
 * `Form` is most useful for submissions that should also change the URL or
 * otherwise add an entry to the browser history stack. For forms that shouldn't
 * manipulate the browser [`History`](https://developer.mozilla.org/en-US/docs/Web/API/History)
 * stack, use {@link FetcherWithComponents.Form | `<fetcher.Form>`}.
 *
 * @example
 * import { Form } from "react-router";
 *
 * function NewEvent() {
 *   return (
 *     <Form action="/events" method="post">
 *       <input name="title" type="text" />
 *       <input name="description" type="text" />
 *     </Form>
 *   );
 * }
 *
 * @public
 * @category Components
 * @mode framework
 * @mode data
 * @param {FormProps.action} action n/a
 * @param {FormProps.discover} discover n/a
 * @param {FormProps.encType} encType n/a
 * @param {FormProps.fetcherKey} fetcherKey n/a
 * @param {FormProps.method} method n/a
 * @param {FormProps.navigate} navigate n/a
 * @param {FormProps.onSubmit} onSubmit n/a
 * @param {FormProps.preventScrollReset} preventScrollReset n/a
 * @param {FormProps.relative} relative n/a
 * @param {FormProps.reloadDocument} reloadDocument n/a
 * @param {FormProps.replace} replace n/a
 * @param {FormProps.state} state n/a
 * @param {FormProps.viewTransition} viewTransition n/a
 * @returns A progressively enhanced [`<form>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/form) component
 */
declare const Form: React.ForwardRefExoticComponent<FormProps & React.RefAttributes<HTMLFormElement>>;
type ScrollRestorationProps = ScriptsProps & {
    /**
     * A function that returns a key to use for scroll restoration. This is useful
     * for custom scroll restoration logic, such as using only the pathname so
     * that later navigations to prior paths will restore the scroll. Defaults to
     * `location.key`. See {@link GetScrollRestorationKeyFunction}.
     *
     * ```tsx
     * <ScrollRestoration
     *   getKey={(location, matches) => {
     *     // Restore based on a unique location key (default behavior)
     *     return location.key
     *
     *     // Restore based on pathname
     *     return location.pathname
     *   }}
     * />
     * ```
     */
    getKey?: GetScrollRestorationKeyFunction;
    /**
     * The key to use for storing scroll positions in [`sessionStorage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage).
     * Defaults to `"react-router-scroll-positions"`.
     */
    storageKey?: string;
};
/**
 * Emulates the browser's scroll restoration on location changes. Apps should only render one of these, right before the {@link Scripts} component.
 *
 * ```tsx
 * import { ScrollRestoration } from "react-router";
 *
 * export default function Root() {
 *   return (
 *     <html>
 *       <body>
 *         <ScrollRestoration />
 *         <Scripts />
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 *
 * This component renders an inline `<script>` to prevent scroll flashing. The `nonce` prop will be passed down to the script tag to allow CSP nonce usage.
 *
 * ```tsx
 * <ScrollRestoration nonce={cspNonce} />
 * ```
 *
 * @public
 * @category Components
 * @mode framework
 * @mode data
 * @param props Props
 * @param {ScrollRestorationProps.getKey} props.getKey n/a
 * @param {ScriptsProps.nonce} props.nonce n/a
 * @param {ScrollRestorationProps.storageKey} props.storageKey n/a
 * @returns A [`<script>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script)
 * tag that restores scroll positions on navigation.
 */
declare function ScrollRestoration({ getKey, storageKey, ...props }: ScrollRestorationProps): React.JSX.Element | null;
declare namespace ScrollRestoration {
    var displayName: string;
}
/**
 * Handles the click behavior for router {@link Link | `<Link>`} components.This
 * is useful if you need to create custom {@link Link | `<Link>`} components with
 * the same click behavior we use in our exported {@link Link | `<Link>`}.
 *
 * @public
 * @category Hooks
 * @param to The URL to navigate to, can be a string or a partial {@link Path}.
 * @param options Options
 * @param options.preventScrollReset Whether to prevent the scroll position from
 * being reset to the top of the viewport on completion of the navigation when
 * using the {@link ScrollRestoration} component. Defaults to `false`.
 * @param options.relative The {@link RelativeRoutingType | relative routing type}
 * to use for the link. Defaults to `"route"`.
 * @param options.replace Whether to replace the current [`History`](https://developer.mozilla.org/en-US/docs/Web/API/History)
 * entry instead of pushing a new one. Defaults to `false`.
 * @param options.state The state to add to the [`History`](https://developer.mozilla.org/en-US/docs/Web/API/History)
 * entry for this navigation. Defaults to `undefined`.
 * @param options.target The target attribute for the link. Defaults to `undefined`.
 * @param options.viewTransition Enables a [View Transition](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API)
 * for this navigation. To apply specific styles during the transition, see
 * {@link useViewTransitionState}. Defaults to `false`.
 * @returns A click handler function that can be used in a custom {@link Link} component.
 */
declare function useLinkClickHandler<E extends Element = HTMLAnchorElement>(to: To, { target, replace: replaceProp, state, preventScrollReset, relative, viewTransition, }?: {
    target?: React.HTMLAttributeAnchorTarget;
    replace?: boolean;
    state?: any;
    preventScrollReset?: boolean;
    relative?: RelativeRoutingType;
    viewTransition?: boolean;
}): (event: React.MouseEvent<E, MouseEvent>) => void;
/**
 * Returns a tuple of the current URL's [`URLSearchParams`](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams)
 * and a function to update them. Setting the search params causes a navigation.
 *
 * ```tsx
 * import { useSearchParams } from "react-router";
 *
 * export function SomeComponent() {
 *   const [searchParams, setSearchParams] = useSearchParams();
 *   // ...
 * }
 * ```
 *
 * ### `setSearchParams` function
 *
 * The second element of the tuple is a function that can be used to update the
 * search params. It accepts the same types as `defaultInit` and will cause a
 * navigation to the new URL.
 *
 * ```tsx
 * let [searchParams, setSearchParams] = useSearchParams();
 *
 * // a search param string
 * setSearchParams("?tab=1");
 *
 * // a shorthand object
 * setSearchParams({ tab: "1" });
 *
 * // object keys can be arrays for multiple values on the key
 * setSearchParams({ brand: ["nike", "reebok"] });
 *
 * // an array of tuples
 * setSearchParams([["tab", "1"]]);
 *
 * // a `URLSearchParams` object
 * setSearchParams(new URLSearchParams("?tab=1"));
 * ```
 *
 * It also supports a function callback like React's
 * [`setState`](https://react.dev/reference/react/useState#setstate):
 *
 * ```tsx
 * setSearchParams((searchParams) => {
 *   searchParams.set("tab", "2");
 *   return searchParams;
 * });
 * ```
 *
 * <docs-warning>The function callback version of `setSearchParams` does not support
 * the [queueing](https://react.dev/reference/react/useState#setstate-parameters)
 * logic that React's `setState` implements.  Multiple calls to `setSearchParams`
 * in the same tick will not build on the prior value.  If you need this behavior,
 * you can use `setState` manually.</docs-warning>
 *
 * ### Notes
 *
 * Note that `searchParams` is a stable reference, so you can reliably use it
 * as a dependency in React's [`useEffect`](https://react.dev/reference/react/useEffect)
 * hooks.
 *
 * ```tsx
 * useEffect(() => {
 *   console.log(searchParams.get("tab"));
 * }, [searchParams]);
 * ```
 *
 * However, this also means it's mutable. If you change the object without
 * calling `setSearchParams`, its values will change between renders if some
 * other state causes the component to re-render and URL will not reflect the
 * values.
 *
 * @public
 * @category Hooks
 * @param defaultInit
 * You can initialize the search params with a default value, though it **will
 * not** change the URL on the first render.
 *
 * ```tsx
 * // a search param string
 * useSearchParams("?tab=1");
 *
 * // a shorthand object
 * useSearchParams({ tab: "1" });
 *
 * // object keys can be arrays for multiple values on the key
 * useSearchParams({ brand: ["nike", "reebok"] });
 *
 * // an array of tuples
 * useSearchParams([["tab", "1"]]);
 *
 * // a `URLSearchParams` object
 * useSearchParams(new URLSearchParams("?tab=1"));
 * ```
 * @returns A tuple of the current [`URLSearchParams`](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams)
 * and a function to update them.
 */
declare function useSearchParams(defaultInit?: URLSearchParamsInit): [URLSearchParams, SetURLSearchParams];
/**
 *  Sets new search params and causes a navigation when called.
 *
 *  ```tsx
 *  <button
 *    onClick={() => {
 *      const params = new URLSearchParams();
 *      params.set("someKey", "someValue");
 *      setSearchParams(params, {
 *        preventScrollReset: true,
 *      });
 *    }}
 *  />
 *  ```
 *
 *  It also supports a function for setting new search params.
 *
 *  ```tsx
 *  <button
 *    onClick={() => {
 *      setSearchParams((prev) => {
 *        prev.set("someKey", "someValue");
 *        return prev;
 *      });
 *    }}
 *  />
 *  ```
 */
type SetURLSearchParams = (nextInit?: URLSearchParamsInit | ((prev: URLSearchParams) => URLSearchParamsInit), navigateOpts?: NavigateOptions) => void;
/**
 * Submits a HTML [`<form>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/form)
 * to the server without reloading the page.
 */
interface SubmitFunction {
    (
    /**
     * Can be multiple types of elements and objects
     *
     * **[`HTMLFormElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement)**
     *
     * ```tsx
     * <Form
     *   onSubmit={(event) => {
     *     submit(event.currentTarget);
     *   }}
     * />
     * ```
     *
     * **[`FormData`](https://developer.mozilla.org/en-US/docs/Web/API/FormData)**
     *
     * ```tsx
     * const formData = new FormData();
     * formData.append("myKey", "myValue");
     * submit(formData, { method: "post" });
     * ```
     *
     * **Plain object that will be serialized as [`FormData`](https://developer.mozilla.org/en-US/docs/Web/API/FormData)**
     *
     * ```tsx
     * submit({ myKey: "myValue" }, { method: "post" });
     * ```
     *
     * **Plain object that will be serialized as JSON**
     *
     * ```tsx
     * submit(
     *   { myKey: "myValue" },
     *   { method: "post", encType: "application/json" }
     * );
     * ```
     */
    target: SubmitTarget, 
    /**
     * Options that override the [`<form>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/form)'s
     * own attributes. Required when submitting arbitrary data without a backing
     * [`<form>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/form).
     */
    options?: SubmitOptions): Promise<void>;
}
/**
 * Submits a fetcher [`<form>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/form) to the server without reloading the page.
 */
interface FetcherSubmitFunction {
    (
    /**
     * Can be multiple types of elements and objects
     *
     * **[`HTMLFormElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement)**
     *
     * ```tsx
     * <fetcher.Form
     *   onSubmit={(event) => {
     *     fetcher.submit(event.currentTarget);
     *   }}
     * />
     * ```
     *
     * **[`FormData`](https://developer.mozilla.org/en-US/docs/Web/API/FormData)**
     *
     * ```tsx
     * const formData = new FormData();
     * formData.append("myKey", "myValue");
     * fetcher.submit(formData, { method: "post" });
     * ```
     *
     * **Plain object that will be serialized as [`FormData`](https://developer.mozilla.org/en-US/docs/Web/API/FormData)**
     *
     * ```tsx
     * fetcher.submit({ myKey: "myValue" }, { method: "post" });
     * ```
     *
     * **Plain object that will be serialized as JSON**
     *
     * ```tsx
     * fetcher.submit(
     *   { myKey: "myValue" },
     *   { method: "post", encType: "application/json" }
     * );
     * ```
     */
    target: SubmitTarget, options?: FetcherSubmitOptions): Promise<void>;
}
/**
 * The imperative version of {@link Form | `<Form>`} that lets you submit a form
 * from code instead of a user interaction.
 *
 * @example
 * import { useSubmit } from "react-router";
 *
 * function SomeComponent() {
 *   const submit = useSubmit();
 *   return (
 *     <Form onChange={(event) => submit(event.currentTarget)} />
 *   );
 * }
 *
 * @public
 * @category Hooks
 * @mode framework
 * @mode data
 * @returns A function that can be called to submit a {@link Form} imperatively.
 */
declare function useSubmit(): SubmitFunction;
/**
 * Resolves the URL to the closest route in the component hierarchy instead of
 * the current URL of the app.
 *
 * This is used internally by {@link Form} to resolve the `action` to the closest
 * route, but can be used generically as well.
 *
 * @example
 * import { useFormAction } from "react-router";
 *
 * function SomeComponent() {
 *   // closest route URL
 *   let action = useFormAction();
 *
 *   // closest route URL + "destroy"
 *   let destroyAction = useFormAction("destroy");
 * }
 *
 * @public
 * @category Hooks
 * @mode framework
 * @mode data
 * @param action The action to append to the closest route URL. Defaults to the
 * closest route URL.
 * @param options Options
 * @param options.relative The relative routing type to use when resolving the
 * action. Defaults to `"route"`.
 * @returns The resolved action URL.
 */
declare function useFormAction(action?: string, { relative }?: {
    relative?: RelativeRoutingType;
}): string;
/**
 * The return value {@link useFetcher} that keeps track of the state of a fetcher.
 *
 * ```tsx
 * let fetcher = useFetcher();
 * ```
 */
type FetcherWithComponents<TData> = Fetcher<TData> & {
    /**
     * Just like {@link Form} except it doesn't cause a navigation.
     *
     * ```tsx
     * function SomeComponent() {
     *   const fetcher = useFetcher()
     *   return (
     *     <fetcher.Form method="post" action="/some/route">
     *       <input type="text" />
     *     </fetcher.Form>
     *   )
     * }
     * ```
     */
    Form: React.ForwardRefExoticComponent<FetcherFormProps & React.RefAttributes<HTMLFormElement>>;
    /**
     *  Submits form data to a route. While multiple nested routes can match a URL, only the leaf route will be called.
     *
     *  The `formData` can be multiple types:
     *
     *  - [`FormData`](https://developer.mozilla.org/en-US/docs/Web/API/FormData)
     *    A `FormData` instance.
     *  - [`HTMLFormElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement)
     *    A [`<form>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/form) DOM element.
     *  - `Object`
     *    An object of key/value-pairs that will be converted to a [`FormData`](https://developer.mozilla.org/en-US/docs/Web/API/FormData)
     *    instance by default. You can pass a more complex object and serialize it
     *    as JSON by specifying `encType: "application/json"`. See
     *    {@link useSubmit} for more details.
     *
     *  If the method is `GET`, then the route [`loader`](../../start/framework/route-module#loader)
     *  is being called and with the `formData` serialized to the url as [`URLSearchParams`](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams).
     *  If `DELETE`, `PATCH`, `POST`, or `PUT`, then the route [`action`](../../start/framework/route-module#action)
     *  is being called with `formData` as the body.
     *
     *  ```tsx
     *  // Submit a FormData instance (GET request)
     *  const formData = new FormData();
     *  fetcher.submit(formData);
     *
     *  // Submit the HTML form element
     *  fetcher.submit(event.currentTarget.form, {
     *    method: "POST",
     *  });
     *
     *  // Submit key/value JSON as a FormData instance
     *  fetcher.submit(
     *    { serialized: "values" },
     *    { method: "POST" }
     *  );
     *
     *  // Submit raw JSON
     *  fetcher.submit(
     *    {
     *      deeply: {
     *        nested: {
     *          json: "values",
     *        },
     *      },
     *    },
     *    {
     *      method: "POST",
     *      encType: "application/json",
     *    }
     *  );
     *  ```
     */
    submit: FetcherSubmitFunction;
    /**
     * Loads data from a route. Useful for loading data imperatively inside user
     * events outside a normal button or form, like a combobox or search input.
     *
     * ```tsx
     * let fetcher = useFetcher()
     *
     * <input onChange={e => {
     *   fetcher.load(`/search?q=${e.target.value}`)
     * }} />
     * ```
     */
    load: (href: string, opts?: {
        /**
         * Wraps the initial state update for this `fetcher.load` in a
         * [`ReactDOM.flushSync`](https://react.dev/reference/react-dom/flushSync)
         * call instead of the default [`React.startTransition`](https://react.dev/reference/react/startTransition).
         * This allows you to perform synchronous DOM actions immediately after the
         * update is flushed to the DOM.
         */
        flushSync?: boolean;
    }) => Promise<void>;
};
/**
 * Useful for creating complex, dynamic user interfaces that require multiple,
 * concurrent data interactions without causing a navigation.
 *
 * Fetchers track their own, independent state and can be used to load data, submit
 * forms, and generally interact with [`action`](../../start/framework/route-module#action)
 * and [`loader`](../../start/framework/route-module#loader) functions.
 *
 * @example
 * import { useFetcher } from "react-router"
 *
 * function SomeComponent() {
 *   let fetcher = useFetcher()
 *
 *   // states are available on the fetcher
 *   fetcher.state // "idle" | "loading" | "submitting"
 *   fetcher.data // the data returned from the action or loader
 *
 *   // render a form
 *   <fetcher.Form method="post" />
 *
 *   // load data
 *   fetcher.load("/some/route")
 *
 *   // submit data
 *   fetcher.submit(someFormRef, { method: "post" })
 *   fetcher.submit(someData, {
 *     method: "post",
 *     encType: "application/json"
 *   })
 * }
 *
 * @public
 * @category Hooks
 * @mode framework
 * @mode data
 * @param options Options
 * @param options.key A unique key to identify the fetcher.
 *
 *
 * By default, `useFetcher` generates a unique fetcher scoped to that component.
 * If you want to identify a fetcher with your own key such that you can access
 * it from elsewhere in your app, you can do that with the `key` option:
 *
 * ```tsx
 * function SomeComp() {
 *   let fetcher = useFetcher({ key: "my-key" })
 *   // ...
 * }
 *
 * // Somewhere else
 * function AnotherComp() {
 *   // this will be the same fetcher, sharing the state across the app
 *   let fetcher = useFetcher({ key: "my-key" });
 *   // ...
 * }
 * ```
 * @returns A {@link FetcherWithComponents} object that contains the fetcher's state, data, and components for submitting forms and loading data.
 */
declare function useFetcher<T = any>({ key, }?: {
    key?: string;
}): FetcherWithComponents<SerializeFrom<T>>;
/**
 * Returns an array of all in-flight {@link Fetcher}s. This is useful for components
 * throughout the app that didn't create the fetchers but want to use their submissions
 * to participate in optimistic UI.
 *
 * @example
 * import { useFetchers } from "react-router";
 *
 * function SomeComponent() {
 *   const fetchers = useFetchers();
 *   fetchers[0].formData; // FormData
 *   fetchers[0].state; // etc.
 *   // ...
 * }
 *
 * @public
 * @category Hooks
 * @mode framework
 * @mode data
 * @returns An array of all in-flight {@link Fetcher}s, each with a unique `key`
 * property.
 */
declare function useFetchers(): (Fetcher & {
    key: string;
})[];
/**
 * When rendered inside a {@link RouterProvider}, will restore scroll positions
 * on navigations
 *
 * <!--
 * Not marked `@public` because we only export as UNSAFE_ and therefore we don't
 * maintain an .md file for this hook
 * -->
 *
 * @name UNSAFE_useScrollRestoration
 * @category Hooks
 * @mode framework
 * @mode data
 * @param options Options
 * @param options.getKey A function that returns a key to use for scroll restoration.
 * This is useful for custom scroll restoration logic, such as using only the pathname
 * so that subsequent navigations to prior paths will restore the scroll. Defaults
 * to `location.key`.
 * @param options.storageKey The key to use for storing scroll positions in
 * `sessionStorage`. Defaults to `"react-router-scroll-positions"`.
 * @returns {void}
 */
declare function useScrollRestoration({ getKey, storageKey, }?: {
    getKey?: GetScrollRestorationKeyFunction;
    storageKey?: string;
}): void;
/**
 * Set up a callback to be fired on [Window's `beforeunload` event](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event).
 *
 * @public
 * @category Hooks
 * @param callback The callback to be called when the [`beforeunload` event](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event)
 * is fired.
 * @param options Options
 * @param options.capture If `true`, the event will be captured during the capture
 * phase. Defaults to `false`.
 * @returns {void}
 */
declare function useBeforeUnload(callback: (event: BeforeUnloadEvent) => any, options?: {
    capture?: boolean;
}): void;
/**
 * Wrapper around {@link useBlocker} to show a [`window.confirm`](https://developer.mozilla.org/en-US/docs/Web/API/Window/confirm)
 * prompt to users instead of building a custom UI with {@link useBlocker}.
 *
 * The `unstable_` flag will not be removed because this technique has a lot of
 * rough edges and behaves very differently (and incorrectly sometimes) across
 * browsers if users click addition back/forward navigations while the
 * confirmation is open. Use at your own risk.
 *
 * @example
 * function ImportantForm() {
 *   let [value, setValue] = React.useState("");
 *
 *   // Block navigating elsewhere when data has been entered into the input
 *   unstable_usePrompt({
 *     message: "Are you sure?",
 *     when: ({ currentLocation, nextLocation }) =>
 *       value !== "" &&
 *       currentLocation.pathname !== nextLocation.pathname,
 *   });
 *
 *   return (
 *     <Form method="post">
 *       <label>
 *         Enter some important data:
 *         <input
 *           name="data"
 *           value={value}
 *           onChange={(e) => setValue(e.target.value)}
 *         />
 *       </label>
 *       <button type="submit">Save</button>
 *     </Form>
 *   );
 * }
 *
 * @name unstable_usePrompt
 * @public
 * @category Hooks
 * @mode framework
 * @mode data
 * @param options Options
 * @param options.message The message to show in the confirmation dialog.
 * @param options.when A boolean or a function that returns a boolean indicating
 * whether to block the navigation. If a function is provided, it will receive an
 * object with `currentLocation` and `nextLocation` properties.
 * @returns {void}
 */
declare function usePrompt({ when, message, }: {
    when: boolean | BlockerFunction;
    message: string;
}): void;
/**
 * This hook returns `true` when there is an active [View Transition](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API)
 * to the specified location. This can be used to apply finer-grained styles to
 * elements to further customize the view transition. This requires that view
 * transitions have been enabled for the given navigation via {@link LinkProps.viewTransition}
 * (or the `Form`, `submit`, or `navigate` call)
 *
 * @public
 * @category Hooks
 * @mode framework
 * @mode data
 * @param to The {@link To} location to check for an active [View Transition](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API).
 * @param options Options
 * @param options.relative The relative routing type to use when resolving the
 * `to` location, defaults to `"route"`. See {@link RelativeRoutingType} for
 * more details.
 * @returns `true` if there is an active [View Transition](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API)
 * to the specified {@link Location}, otherwise `false`.
 */
declare function useViewTransitionState(to: To, { relative }?: {
    relative?: RelativeRoutingType;
}): boolean;

/**
 * @category Types
 */
interface StaticRouterProps {
    /**
     * The base URL for the static router (default: `/`)
     */
    basename?: string;
    /**
     * The child elements to render inside the static router
     */
    children?: React.ReactNode;
    /**
     * The {@link Location} to render the static router at (default: `/`)
     */
    location: Partial<Location> | string;
}
/**
 * A {@link Router | `<Router>`} that may not navigate to any other {@link Location}.
 * This is useful on the server where there is no stateful UI.
 *
 * @public
 * @category Declarative Routers
 * @mode declarative
 * @param props Props
 * @param {StaticRouterProps.basename} props.basename n/a
 * @param {StaticRouterProps.children} props.children n/a
 * @param {StaticRouterProps.location} props.location n/a
 * @returns A React element that renders the static {@link Router | `<Router>`}
 */
declare function StaticRouter({ basename, children, location: locationProp, }: StaticRouterProps): React.JSX.Element;
/**
 * @category Types
 */
interface StaticRouterProviderProps {
    /**
     * The {@link StaticHandlerContext} returned from {@link StaticHandler}'s
     * `query`
     */
    context: StaticHandlerContext;
    /**
     * The static {@link DataRouter} from {@link createStaticRouter}
     */
    router: Router$1;
    /**
     * Whether to hydrate the router on the client (default `true`)
     */
    hydrate?: boolean;
    /**
     * The [`nonce`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/nonce)
     * to use for the hydration [`<script>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script)
     * tag
     */
    nonce?: string;
}
/**
 * A {@link DataRouter} that may not navigate to any other {@link Location}.
 * This is useful on the server where there is no stateful UI.
 *
 * @example
 * export async function handleRequest(request: Request) {
 *   let { query, dataRoutes } = createStaticHandler(routes);
 *   let context = await query(request));
 *
 *   if (context instanceof Response) {
 *     return context;
 *   }
 *
 *   let router = createStaticRouter(dataRoutes, context);
 *   return new Response(
 *     ReactDOMServer.renderToString(<StaticRouterProvider ... />),
 *     { headers: { "Content-Type": "text/html" } }
 *   );
 * }
 *
 * @public
 * @category Data Routers
 * @mode data
 * @param props Props
 * @param {StaticRouterProviderProps.context} props.context n/a
 * @param {StaticRouterProviderProps.hydrate} props.hydrate n/a
 * @param {StaticRouterProviderProps.nonce} props.nonce n/a
 * @param {StaticRouterProviderProps.router} props.router n/a
 * @returns A React element that renders the static router provider
 */
declare function StaticRouterProvider({ context, router, hydrate, nonce, }: StaticRouterProviderProps): React.JSX.Element;
type CreateStaticHandlerOptions = Omit<CreateStaticHandlerOptions$1, "mapRouteProperties">;
/**
 * Create a static handler to perform server-side data loading
 *
 * @example
 * export async function handleRequest(request: Request) {
 *   let { query, dataRoutes } = createStaticHandler(routes);
 *   let context = await query(request);
 *
 *   if (context instanceof Response) {
 *     return context;
 *   }
 *
 *   let router = createStaticRouter(dataRoutes, context);
 *   return new Response(
 *     ReactDOMServer.renderToString(<StaticRouterProvider ... />),
 *     { headers: { "Content-Type": "text/html" } }
 *   );
 * }
 *
 * @public
 * @category Data Routers
 * @mode data
 * @param routes The {@link RouteObject | route objects} to create a static
 * handler for
 * @param opts Options
 * @param opts.basename The base URL for the static handler (default: `/`)
 * @param opts.future Future flags for the static handler
 * @returns A static handler that can be used to query data for the provided
 * routes
 */
declare function createStaticHandler(routes: RouteObject[], opts?: CreateStaticHandlerOptions): StaticHandler;
/**
 * Create a static {@link DataRouter} for server-side rendering
 *
 * @example
 * export async function handleRequest(request: Request) {
 *   let { query, dataRoutes } = createStaticHandler(routes);
 *   let context = await query(request);
 *
 *   if (context instanceof Response) {
 *     return context;
 *   }
 *
 *   let router = createStaticRouter(dataRoutes, context);
 *   return new Response(
 *     ReactDOMServer.renderToString(<StaticRouterProvider ... />),
 *     { headers: { "Content-Type": "text/html" } }
 *   );
 * }
 *
 * @public
 * @category Data Routers
 * @mode data
 * @param routes The route objects to create a static {@link DataRouter} for
 * @param context The {@link StaticHandlerContext} returned from {@link StaticHandler}'s
 * `query`
 * @param opts Options
 * @param opts.future Future flags for the static {@link DataRouter}
 * @returns A static {@link DataRouter} that can be used to render the provided routes
 */
declare function createStaticRouter(routes: RouteObject[], context: StaticHandlerContext, opts?: {
    future?: Partial<FutureConfig$1>;
}): Router$1;

export { ScrollRestoration as $, type AssetsManifest as A, type BrowserRouterProps as B, type ScrollRestorationProps as C, type DOMRouterOpts as D, type EntryContext as E, type FutureConfig as F, type SetURLSearchParams as G, type HydrateFallbackType as H, type IndexRouteProps as I, type SubmitFunction as J, type FetcherSubmitFunction as K, type LayoutRouteProps as L, type MemoryRouterOpts as M, type NavigateProps as N, type OutletProps as O, type PathRouteProps as P, type FetcherWithComponents as Q, type RouteComponentType as R, type ServerBuild as S, createBrowserRouter as T, createHashRouter as U, BrowserRouter as V, HashRouter as W, Link as X, HistoryRouter as Y, NavLink as Z, Form as _, type ErrorBoundaryType as a, useLinkClickHandler as a0, useSearchParams as a1, useSubmit as a2, useFormAction as a3, useFetcher as a4, useFetchers as a5, useBeforeUnload as a6, usePrompt as a7, useViewTransitionState as a8, type FetcherSubmitOptions as a9, withComponentProps as aA, WithHydrateFallbackProps as aB, withHydrateFallbackProps as aC, WithErrorBoundaryProps as aD, withErrorBoundaryProps as aE, FrameworkContext as aF, createClientRoutes as aG, createClientRoutesWithHMRRevalidationOptOut as aH, shouldHydrateRouteLoader as aI, useScrollRestoration as aJ, type ParamKeyValuePair as aa, type SubmitOptions as ab, type URLSearchParamsInit as ac, type SubmitTarget as ad, createSearchParams as ae, type StaticRouterProps as af, type StaticRouterProviderProps as ag, createStaticHandler as ah, createStaticRouter as ai, StaticRouter as aj, StaticRouterProvider as ak, Meta as al, Links as am, Scripts as an, PrefetchPageLinks as ao, type LinksProps as ap, type ScriptsProps as aq, type PrefetchBehavior as ar, type DiscoverBehavior as as, type HandleDataRequestFunction as at, type HandleDocumentRequestFunction as au, type HandleErrorFunction as av, type ServerEntryModule as aw, hydrationRouteProperties as ax, mapRouteProperties as ay, WithComponentProps as az, type AwaitProps as b, type MemoryRouterProps as c, type RouteProps as d, type RouterProps as e, type RouterProviderProps as f, type RoutesProps as g, Await as h, MemoryRouter as i, Navigate as j, Outlet as k, Route$1 as l, Router as m, RouterProvider as n, Routes as o, createMemoryRouter as p, createRoutesFromChildren as q, createRoutesFromElements as r, renderMatches as s, type HashRouterProps as t, type HistoryRouterProps as u, type LinkProps as v, type NavLinkProps as w, type NavLinkRenderProps as x, type FetcherFormProps as y, type FormProps as z };
