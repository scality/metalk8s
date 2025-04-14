import { R as RouteModules, a as Router, D as DataStrategyFunction, A as ActionFunction, L as LoaderFunction, C as ClientActionFunction, b as ClientLoaderFunction, c as LinksFunction, M as MetaFunction, d as RouteManifest, e as LoaderFunctionArgs, f as ActionFunctionArgs, T as To, g as RelativeRoutingType, h as Location, i as Action, P as ParamParseKey, j as Path, k as PathPattern, l as PathMatch, N as NavigateOptions, m as Params, n as RouteObject, o as Navigation, p as RevalidationState, U as UIMatch, S as SerializeFrom, B as BlockerFunction, q as Blocker, r as StaticHandlerContext, s as StaticHandler, F as FutureConfig$1, t as CreateStaticHandlerOptions$1, I as InitialEntry, H as HydrationState, u as IndexRouteObject, v as NonIndexRouteObject, w as RouterState } from './route-data-DuV3tXo2.js';
export { ap as ClientActionFunctionArgs, aq as ClientLoaderFunctionArgs, aj as DataRouteMatch, ak as DataRouteObject, Q as DataStrategyFunctionArgs, V as DataStrategyMatch, W as DataStrategyResult, Y as ErrorResponse, y as Fetcher, Z as FormEncType, _ as FormMethod, G as GetScrollPositionFunction, x as GetScrollRestorationKeyFunction, $ as HTMLFormMethod, au as HtmlLinkDescriptor, a9 as IDLE_BLOCKER, a8 as IDLE_FETCHER, a7 as IDLE_NAVIGATION, a0 as LazyRouteFunction, av as LinkDescriptor, ar as MetaArgs, as as MetaDescriptor, z as NavigationStates, al as Navigator, at as PageLinkDescriptor, am as PatchRoutesOnNavigationFunction, an as PatchRoutesOnNavigationFunctionArgs, a1 as PathParam, a2 as RedirectFunction, ao as RouteMatch, O as RouterFetchOptions, E as RouterInit, K as RouterNavigateOptions, J as RouterSubscriber, a3 as ShouldRevalidateFunction, a4 as ShouldRevalidateFunctionArgs, aA as UNSAFE_DataRouterContext, aB as UNSAFE_DataRouterStateContext, X as UNSAFE_DataWithResponseInit, az as UNSAFE_ErrorResponseImpl, aC as UNSAFE_FetchersContext, aD as UNSAFE_LocationContext, aE as UNSAFE_NavigationContext, aF as UNSAFE_RouteContext, aG as UNSAFE_ViewTransitionContext, aw as UNSAFE_createBrowserHistory, ay as UNSAFE_createRouter, ax as UNSAFE_invariant, a5 as createPath, aa as data, ab as generatePath, ac as isRouteErrorResponse, ad as matchPath, ae as matchRoutes, a6 as parsePath, af as redirect, ag as redirectDocument, ah as replace, ai as resolvePath } from './route-data-DuV3tXo2.js';
import { A as AssetsManifest, a as Route, F as FutureConfig, E as EntryContext } from './fog-of-war-CbNQuoo8.js';
export { f as Await, b as AwaitProps, G as BrowserRouter, B as BrowserRouterProps, u as FetcherFormProps, y as FetcherSubmitFunction, a3 as FetcherSubmitOptions, z as FetcherWithComponents, U as Form, v as FormProps, J as HashRouter, H as HashRouterProps, p as HistoryRouterProps, I as IndexRouteProps, L as LayoutRouteProps, K as Link, q as LinkProps, aa as Links, g as MemoryRouter, M as MemoryRouterProps, a9 as Meta, T as NavLink, s as NavLinkProps, t as NavLinkRenderProps, h as Navigate, N as NavigateProps, i as Outlet, O as OutletProps, a4 as ParamKeyValuePair, P as PathRouteProps, ac as PrefetchPageLinks, j as Route, c as RouteProps, k as Router, d as RouterProps, l as RouterProvider, R as RouterProviderProps, m as Routes, e as RoutesProps, ab as Scripts, ad as ScriptsProps, V as ScrollRestoration, S as ScrollRestorationProps, w as SetURLSearchParams, x as SubmitFunction, a5 as SubmitOptions, a7 as SubmitTarget, af as UNSAFE_FrameworkContext, ai as UNSAFE_createClientRoutes, aj as UNSAFE_createClientRoutesWithHMRRevalidationOptOut, ag as UNSAFE_getPatchRoutesOnNavigationFunction, ae as UNSAFE_mapRouteProperties, ak as UNSAFE_shouldHydrateRouteLoader, ah as UNSAFE_useFogOFWarDiscovery, al as UNSAFE_useScrollRestoration, a6 as URLSearchParamsInit, C as createBrowserRouter, D as createHashRouter, n as createMemoryRouter, o as createRoutesFromChildren, o as createRoutesFromElements, a8 as createSearchParams, r as renderMatches, Q as unstable_HistoryRouter, a1 as unstable_usePrompt, a0 as useBeforeUnload, _ as useFetcher, $ as useFetchers, Z as useFormAction, W as useLinkClickHandler, X as useSearchParams, Y as useSubmit, a2 as useViewTransitionState } from './fog-of-war-CbNQuoo8.js';
import * as React from 'react';
import { ReactElement } from 'react';
import { ParseOptions, SerializeOptions } from 'cookie';
export { ParseOptions as CookieParseOptions, SerializeOptions as CookieSerializeOptions } from 'cookie';
import { A as AppLoadContext$1 } from './data-CQbyyGzl.js';

declare const SingleFetchRedirectSymbol: unique symbol;
declare function getSingleFetchDataStrategy(manifest: AssetsManifest, routeModules: RouteModules, getRouter: () => Router): DataStrategyFunction;
declare function decodeViaTurboStream(body: ReadableStream<Uint8Array>, global: Window | typeof globalThis): Promise<{
    done: Promise<undefined>;
    value: unknown;
}>;

/**
 * The mode to use when running the server.
 */
declare enum ServerMode {
    Development = "development",
    Production = "production",
    Test = "test"
}

type HeadersArgs = {
    loaderHeaders: Headers;
    parentHeaders: Headers;
    actionHeaders: Headers;
    errorHeaders: Headers | undefined;
};
/**
 * A function that returns HTTP headers to be used for a route. These headers
 * will be merged with (and take precedence over) headers from parent routes.
 */
interface HeadersFunction {
    (args: HeadersArgs): Headers | HeadersInit;
}
/**
 * An arbitrary object that is associated with a route.
 */
type RouteHandle = unknown;
interface EntryRouteModule {
    clientAction?: ClientActionFunction;
    clientLoader?: ClientLoaderFunction;
    ErrorBoundary?: any;
    HydrateFallback?: any;
    Layout?: any;
    default: any;
    handle?: RouteHandle;
    links?: LinksFunction;
    meta?: MetaFunction;
}
interface ServerRouteModule extends EntryRouteModule {
    action?: ActionFunction;
    headers?: HeadersFunction | {
        [name: string]: string;
    };
    loader?: LoaderFunction;
}

type ServerRouteManifest = RouteManifest<Omit<ServerRoute, "children">>;
interface ServerRoute extends Route {
    children: ServerRoute[];
    module: ServerRouteModule;
}

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
    isSpaMode: boolean;
}
interface HandleDocumentRequestFunction {
    (request: Request, responseStatusCode: number, responseHeaders: Headers, context: EntryContext, loadContext: AppLoadContext$1): Promise<Response> | Response;
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

/**
  Resolves a URL against the current location.

  ```tsx
  import { useHref } from "react-router"

  function SomeComponent() {
    let href = useHref("some/where");
    // "/resolved/some/where"
  }
  ```

  @category Hooks
 */
declare function useHref(to: To, { relative }?: {
    relative?: RelativeRoutingType;
}): string;
/**
 * Returns true if this component is a descendant of a Router, useful to ensure
 * a component is used within a Router.
 *
 * @category Hooks
 */
declare function useInRouterContext(): boolean;
/**
  Returns the current {@link Location}. This can be useful if you'd like to perform some side effect whenever it changes.

  ```tsx
  import * as React from 'react'
  import { useLocation } from 'react-router'

  function SomeComponent() {
    let location = useLocation()

    React.useEffect(() => {
      // Google Analytics
      ga('send', 'pageview')
    }, [location]);

    return (
      // ...
    );
  }
  ```

  @category Hooks
 */
declare function useLocation(): Location;
/**
 * Returns the current navigation action which describes how the router came to
 * the current location, either by a pop, push, or replace on the history stack.
 *
 * @category Hooks
 */
declare function useNavigationType(): Action;
/**
 * Returns a PathMatch object if the given pattern matches the current URL.
 * This is useful for components that need to know "active" state, e.g.
 * `<NavLink>`.
 *
 * @category Hooks
 */
declare function useMatch<ParamKey extends ParamParseKey<Path>, Path extends string>(pattern: PathPattern<Path> | Path): PathMatch<ParamKey> | null;
/**
 * The interface for the navigate() function returned from useNavigate().
 */
interface NavigateFunction {
    (to: To, options?: NavigateOptions): void | Promise<void>;
    (delta: number): void | Promise<void>;
}
/**
  Returns a function that lets you navigate programmatically in the browser in response to user interactions or effects.

  ```tsx
  import { useNavigate } from "react-router";

  function SomeComponent() {
    let navigate = useNavigate();
    return (
      <button
        onClick={() => {
          navigate(-1);
        }}
      />
    );
  }
  ```

  It's often better to use {@link redirect} in {@link ActionFunction | actions} and {@link LoaderFunction | loaders} than this hook.

  @category Hooks
 */
declare function useNavigate(): NavigateFunction;
/**
 * Returns the parent route {@link OutletProps.context | `<Outlet context>`}.
 *
 * @category Hooks
 */
declare function useOutletContext<Context = unknown>(): Context;
/**
 * Returns the element for the child route at this level of the route
 * hierarchy. Used internally by `<Outlet>` to render child routes.
 *
 * @category Hooks
 */
declare function useOutlet(context?: unknown): React.ReactElement | null;
/**
  Returns an object of key/value pairs of the dynamic params from the current URL that were matched by the routes. Child routes inherit all params from their parent routes.

  ```tsx
  import { useParams } from "react-router"

  function SomeComponent() {
    let params = useParams()
    params.postId
  }
  ```

  Assuming a route pattern like `/posts/:postId` is matched by `/posts/123` then `params.postId` will be `"123"`.

  @category Hooks
 */
declare function useParams<ParamsOrKey extends string | Record<string, string | undefined> = string>(): Readonly<[
    ParamsOrKey
] extends [string] ? Params<ParamsOrKey> : Partial<ParamsOrKey>>;
/**
  Resolves the pathname of the given `to` value against the current location. Similar to {@link useHref}, but returns a {@link Path} instead of a string.

  ```tsx
  import { useResolvedPath } from "react-router"

  function SomeComponent() {
    // if the user is at /dashboard/profile
    let path = useResolvedPath("../accounts")
    path.pathname // "/dashboard/accounts"
    path.search // ""
    path.hash // ""
  }
  ```

  @category Hooks
 */
declare function useResolvedPath(to: To, { relative }?: {
    relative?: RelativeRoutingType;
}): Path;
/**
  Hook version of {@link Routes | `<Routes>`} that uses objects instead of components. These objects have the same properties as the component props.

  The return value of `useRoutes` is either a valid React element you can use to render the route tree, or `null` if nothing matched.

  ```tsx
  import * as React from "react";
  import { useRoutes } from "react-router";

  function App() {
    let element = useRoutes([
      {
        path: "/",
        element: <Dashboard />,
        children: [
          {
            path: "messages",
            element: <DashboardMessages />,
          },
          { path: "tasks", element: <DashboardTasks /> },
        ],
      },
      { path: "team", element: <AboutPage /> },
    ]);

    return element;
  }
  ```

 @category Hooks
 */
declare function useRoutes(routes: RouteObject[], locationArg?: Partial<Location> | string): React.ReactElement | null;
/**
  Returns the current navigation, defaulting to an "idle" navigation when no navigation is in progress. You can use this to render pending UI (like a global spinner) or read FormData from a form navigation.

  ```tsx
  import { useNavigation } from "react-router"

  function SomeComponent() {
    let navigation = useNavigation();
    navigation.state
    navigation.formData
    // etc.
  }
  ```

  @category Hooks
 */
declare function useNavigation(): Navigation;
/**
  Revalidate the data on the page for reasons outside of normal data mutations like window focus or polling on an interval.

  ```tsx
  import { useRevalidator } from "react-router";

  function WindowFocusRevalidator() {
    const revalidator = useRevalidator();

    useFakeWindowFocus(() => {
      revalidator.revalidate();
    });

    return (
      <div hidden={revalidator.state === "idle"}>
        Revalidating...
      </div>
    );
  }
  ```

  Note that page data is already revalidated automatically after actions. If you find yourself using this for normal CRUD operations on your data in response to user interactions, you're probably not taking advantage of the other APIs like {@link useFetcher}, {@link Form}, {@link useSubmit} that do this automatically.

  @category Hooks
 */
declare function useRevalidator(): {
    revalidate(): Promise<void>;
    state: RevalidationState;
};
/**
 * Returns the active route matches, useful for accessing loaderData for
 * parent/child routes or the route "handle" property
 *
 * @category Hooks
 */
declare function useMatches(): UIMatch[];
/**
  Returns the data from the closest route {@link LoaderFunction | loader} or {@link ClientLoaderFunction | client loader}.

  ```tsx
  import { useLoaderData } from "react-router"

  export async function loader() {
    return await fakeDb.invoices.findAll();
  }

  export default function Invoices() {
    let invoices = useLoaderData<typeof loader>();
    // ...
  }
  ```

  @category Hooks
 */
declare function useLoaderData<T = any>(): SerializeFrom<T>;
/**
  Returns the loader data for a given route by route ID.

  ```tsx
  import { useRouteLoaderData } from "react-router";

  function SomeComponent() {
    const { user } = useRouteLoaderData("root");
  }
  ```

  Route IDs are created automatically. They are simply the path of the route file relative to the app folder without the extension.

  | Route Filename             | Route ID             |
  | -------------------------- | -------------------- |
  | `app/root.tsx`             | `"root"`             |
  | `app/routes/teams.tsx`     | `"routes/teams"`     |
  | `app/whatever/teams.$id.tsx` | `"whatever/teams.$id"` |

  If you created an ID manually, you can use that instead:

  ```tsx
  route("/", "containers/app.tsx", { id: "app" }})
  ```

  @category Hooks
 */
declare function useRouteLoaderData<T = any>(routeId: string): SerializeFrom<T> | undefined;
/**
  Returns the action data from the most recent POST navigation form submission or `undefined` if there hasn't been one.

  ```tsx
  import { Form, useActionData } from "react-router"

  export async function action({ request }) {
    const body = await request.formData()
    const name = body.get("visitorsName")
    return { message: `Hello, ${name}` }
  }

  export default function Invoices() {
    const data = useActionData()
    return (
      <Form method="post">
        <input type="text" name="visitorsName" />
        {data ? data.message : "Waiting..."}
      </Form>
    )
  }
  ```

  @category Hooks
 */
declare function useActionData<T = any>(): SerializeFrom<T> | undefined;
/**
  Accesses the error thrown during an {@link ActionFunction | action}, {@link LoaderFunction | loader}, or component render to be used in a route module Error Boundary.

  ```tsx
  export function ErrorBoundary() {
    const error = useRouteError();
    return <div>{error.message}</div>;
  }
  ```

  @category Hooks
 */
declare function useRouteError(): unknown;
/**
  Returns the resolved promise value from the closest {@link Await | `<Await>`}.

  ```tsx
  function SomeDescendant() {
    const value = useAsyncValue();
    // ...
  }

  // somewhere in your app
  <Await resolve={somePromise}>
    <SomeDescendant />
  </Await>
  ```

  @category Hooks
 */
declare function useAsyncValue(): unknown;
/**
  Returns the rejection value from the closest {@link Await | `<Await>`}.

  ```tsx
  import { Await, useAsyncError } from "react-router"

  function ErrorElement() {
    const error = useAsyncError();
    return (
      <p>Uh Oh, something went wrong! {error.message}</p>
    );
  }

  // somewhere in your app
  <Await
    resolve={promiseThatRejects}
    errorElement={<ErrorElement />}
  />
  ```

  @category Hooks
 */
declare function useAsyncError(): unknown;
/**
 * Allow the application to block navigations within the SPA and present the
 * user a confirmation dialog to confirm the navigation.  Mostly used to avoid
 * using half-filled form data.  This does not handle hard-reloads or
 * cross-origin navigations.
 *
 * @category Hooks
 */
declare function useBlocker(shouldBlock: boolean | BlockerFunction): Blocker;

interface StaticRouterProps {
    basename?: string;
    children?: React.ReactNode;
    location: Partial<Location> | string;
}
/**
 * A `<Router>` that may not navigate to any other location. This is useful
 * on the server where there is no stateful UI.
 *
 * @category Router Components
 */
declare function StaticRouter({ basename, children, location: locationProp, }: StaticRouterProps): React.JSX.Element;
interface StaticRouterProviderProps {
    context: StaticHandlerContext;
    router: Router;
    hydrate?: boolean;
    nonce?: string;
}
/**
 * A Data Router that may not navigate to any other location. This is useful
 * on the server where there is no stateful UI.
 *
 * @category Router Components
 */
declare function StaticRouterProvider({ context, router, hydrate, nonce, }: StaticRouterProviderProps): React.JSX.Element;
type CreateStaticHandlerOptions = Omit<CreateStaticHandlerOptions$1, "mapRouteProperties">;
/**
 * @category Utils
 */
declare function createStaticHandler(routes: RouteObject[], opts?: CreateStaticHandlerOptions): StaticHandler;
/**
 * @category Routers
 */
declare function createStaticRouter(routes: RouteObject[], context: StaticHandlerContext, opts?: {
    future?: Partial<FutureConfig$1>;
}): Router;

interface ServerRouterProps {
    context: EntryContext;
    url: string | URL;
    abortDelay?: number;
    nonce?: string;
}
/**
 * The entry point for a Remix app when it is rendered on the server (in
 * `app/entry.server.js`). This component is used to generate the HTML in the
 * response from the server.
 *
 * @category Components
 */
declare function ServerRouter({ context, url, abortDelay, nonce, }: ServerRouterProps): ReactElement;

interface StubIndexRouteObject extends Omit<IndexRouteObject, "loader" | "action" | "element" | "errorElement" | "children"> {
    loader?: LoaderFunction;
    action?: ActionFunction;
    children?: StubRouteObject[];
    meta?: MetaFunction;
    links?: LinksFunction;
}
interface StubNonIndexRouteObject extends Omit<NonIndexRouteObject, "loader" | "action" | "element" | "errorElement" | "children"> {
    loader?: LoaderFunction;
    action?: ActionFunction;
    children?: StubRouteObject[];
    meta?: MetaFunction;
    links?: LinksFunction;
}
type StubRouteObject = StubIndexRouteObject | StubNonIndexRouteObject;
interface AppLoadContext {
    [key: string]: unknown;
}
interface RoutesTestStubProps {
    /**
     *  The initial entries in the history stack. This allows you to start a test with
     *  multiple locations already in the history stack (for testing a back navigation, etc.)
     *  The test will default to the last entry in initialEntries if no initialIndex is provided.
     *  e.g. initialEntries={["/home", "/about", "/contact"]}
     */
    initialEntries?: InitialEntry[];
    /**
     * The initial index in the history stack to render. This allows you to start a test at a specific entry.
     * It defaults to the last entry in initialEntries.
     * e.g.
     *   initialEntries: ["/", "/events/123"]
     *   initialIndex: 1 // start at "/events/123"
     */
    initialIndex?: number;
    /**
     *  Used to set the route's initial loader and action data.
     *  e.g. hydrationData={{
     *   loaderData: { "/contact": { locale: "en-US" } },
     *   actionData: { "/login": { errors: { email: "invalid email" } }}
     *  }}
     */
    hydrationData?: HydrationState;
    /**
     * Future flags mimicking the settings in react-router.config.ts
     */
    future?: Partial<FutureConfig>;
}
/**
 * @category Utils
 */
declare function createRoutesStub(routes: StubRouteObject[], context?: AppLoadContext): ({ initialEntries, initialIndex, hydrationData, future, }: RoutesTestStubProps) => React.JSX.Element;

interface CookieSignatureOptions {
    /**
     * An array of secrets that may be used to sign/unsign the value of a cookie.
     *
     * The array makes it easy to rotate secrets. New secrets should be added to
     * the beginning of the array. `cookie.serialize()` will always use the first
     * value in the array, but `cookie.parse()` may use any of them so that
     * cookies that were signed with older secrets still work.
     */
    secrets?: string[];
}
type CookieOptions = ParseOptions & SerializeOptions & CookieSignatureOptions;
/**
 * A HTTP cookie.
 *
 * A Cookie is a logical container for metadata about a HTTP cookie; its name
 * and options. But it doesn't contain a value. Instead, it has `parse()` and
 * `serialize()` methods that allow a single instance to be reused for
 * parsing/encoding multiple different values.
 *
 * @see https://remix.run/utils/cookies#cookie-api
 */
interface Cookie {
    /**
     * The name of the cookie, used in the `Cookie` and `Set-Cookie` headers.
     */
    readonly name: string;
    /**
     * True if this cookie uses one or more secrets for verification.
     */
    readonly isSigned: boolean;
    /**
     * The Date this cookie expires.
     *
     * Note: This is calculated at access time using `maxAge` when no `expires`
     * option is provided to `createCookie()`.
     */
    readonly expires?: Date;
    /**
     * Parses a raw `Cookie` header and returns the value of this cookie or
     * `null` if it's not present.
     */
    parse(cookieHeader: string | null, options?: ParseOptions): Promise<any>;
    /**
     * Serializes the given value to a string and returns the `Set-Cookie`
     * header.
     */
    serialize(value: any, options?: SerializeOptions): Promise<string>;
}
/**
 * Creates a logical container for managing a browser cookie from the server.
 */
declare const createCookie: (name: string, cookieOptions?: CookieOptions) => Cookie;
type IsCookieFunction = (object: any) => object is Cookie;
/**
 * Returns true if an object is a Remix cookie container.
 *
 * @see https://remix.run/utils/cookies#iscookie
 */
declare const isCookie: IsCookieFunction;

type RequestHandler = (request: Request, loadContext?: AppLoadContext$1) => Promise<Response>;
type CreateRequestHandlerFunction = (build: ServerBuild | (() => ServerBuild | Promise<ServerBuild>), mode?: string) => RequestHandler;
declare const createRequestHandler: CreateRequestHandlerFunction;

/**
 * An object of name/value pairs to be used in the session.
 */
interface SessionData {
    [name: string]: any;
}
/**
 * Session persists data across HTTP requests.
 *
 * @see https://remix.run/utils/sessions#session-api
 */
interface Session<Data = SessionData, FlashData = Data> {
    /**
     * A unique identifier for this session.
     *
     * Note: This will be the empty string for newly created sessions and
     * sessions that are not backed by a database (i.e. cookie-based sessions).
     */
    readonly id: string;
    /**
     * The raw data contained in this session.
     *
     * This is useful mostly for SessionStorage internally to access the raw
     * session data to persist.
     */
    readonly data: FlashSessionData<Data, FlashData>;
    /**
     * Returns `true` if the session has a value for the given `name`, `false`
     * otherwise.
     */
    has(name: (keyof Data | keyof FlashData) & string): boolean;
    /**
     * Returns the value for the given `name` in this session.
     */
    get<Key extends (keyof Data | keyof FlashData) & string>(name: Key): (Key extends keyof Data ? Data[Key] : undefined) | (Key extends keyof FlashData ? FlashData[Key] : undefined) | undefined;
    /**
     * Sets a value in the session for the given `name`.
     */
    set<Key extends keyof Data & string>(name: Key, value: Data[Key]): void;
    /**
     * Sets a value in the session that is only valid until the next `get()`.
     * This can be useful for temporary values, like error messages.
     */
    flash<Key extends keyof FlashData & string>(name: Key, value: FlashData[Key]): void;
    /**
     * Removes a value from the session.
     */
    unset(name: keyof Data & string): void;
}
type FlashSessionData<Data, FlashData> = Partial<Data & {
    [Key in keyof FlashData as FlashDataKey<Key & string>]: FlashData[Key];
}>;
type FlashDataKey<Key extends string> = `__flash_${Key}__`;
type CreateSessionFunction = <Data = SessionData, FlashData = Data>(initialData?: Data, id?: string) => Session<Data, FlashData>;
/**
 * Creates a new Session object.
 *
 * Note: This function is typically not invoked directly by application code.
 * Instead, use a `SessionStorage` object's `getSession` method.
 *
 * @see https://remix.run/utils/sessions#createsession
 */
declare const createSession: CreateSessionFunction;
type IsSessionFunction = (object: any) => object is Session;
/**
 * Returns true if an object is a Remix session.
 *
 * @see https://remix.run/utils/sessions#issession
 */
declare const isSession: IsSessionFunction;
/**
 * SessionStorage stores session data between HTTP requests and knows how to
 * parse and create cookies.
 *
 * A SessionStorage creates Session objects using a `Cookie` header as input.
 * Then, later it generates the `Set-Cookie` header to be used in the response.
 */
interface SessionStorage<Data = SessionData, FlashData = Data> {
    /**
     * Parses a Cookie header from a HTTP request and returns the associated
     * Session. If there is no session associated with the cookie, this will
     * return a new Session with no data.
     */
    getSession: (cookieHeader?: string | null, options?: ParseOptions) => Promise<Session<Data, FlashData>>;
    /**
     * Stores all data in the Session and returns the Set-Cookie header to be
     * used in the HTTP response.
     */
    commitSession: (session: Session<Data, FlashData>, options?: SerializeOptions) => Promise<string>;
    /**
     * Deletes all data associated with the Session and returns the Set-Cookie
     * header to be used in the HTTP response.
     */
    destroySession: (session: Session<Data, FlashData>, options?: SerializeOptions) => Promise<string>;
}
/**
 * SessionIdStorageStrategy is designed to allow anyone to easily build their
 * own SessionStorage using `createSessionStorage(strategy)`.
 *
 * This strategy describes a common scenario where the session id is stored in
 * a cookie but the actual session data is stored elsewhere, usually in a
 * database or on disk. A set of create, read, update, and delete operations
 * are provided for managing the session data.
 */
interface SessionIdStorageStrategy<Data = SessionData, FlashData = Data> {
    /**
     * The Cookie used to store the session id, or options used to automatically
     * create one.
     */
    cookie?: Cookie | (CookieOptions & {
        name?: string;
    });
    /**
     * Creates a new record with the given data and returns the session id.
     */
    createData: (data: FlashSessionData<Data, FlashData>, expires?: Date) => Promise<string>;
    /**
     * Returns data for a given session id, or `null` if there isn't any.
     */
    readData: (id: string) => Promise<FlashSessionData<Data, FlashData> | null>;
    /**
     * Updates data for the given session id.
     */
    updateData: (id: string, data: FlashSessionData<Data, FlashData>, expires?: Date) => Promise<void>;
    /**
     * Deletes data for a given session id from the data store.
     */
    deleteData: (id: string) => Promise<void>;
}
/**
 * Creates a SessionStorage object using a SessionIdStorageStrategy.
 *
 * Note: This is a low-level API that should only be used if none of the
 * existing session storage options meet your requirements.
 */
declare function createSessionStorage<Data = SessionData, FlashData = Data>({ cookie: cookieArg, createData, readData, updateData, deleteData, }: SessionIdStorageStrategy<Data, FlashData>): SessionStorage<Data, FlashData>;

interface CookieSessionStorageOptions {
    /**
     * The Cookie used to store the session data on the client, or options used
     * to automatically create one.
     */
    cookie?: SessionIdStorageStrategy["cookie"];
}
/**
 * Creates and returns a SessionStorage object that stores all session data
 * directly in the session cookie itself.
 *
 * This has the advantage that no database or other backend services are
 * needed, and can help to simplify some load-balanced scenarios. However, it
 * also has the limitation that serialized session data may not exceed the
 * browser's maximum cookie size. Trade-offs!
 */
declare function createCookieSessionStorage<Data = SessionData, FlashData = Data>({ cookie: cookieArg }?: CookieSessionStorageOptions): SessionStorage<Data, FlashData>;

interface MemorySessionStorageOptions {
    /**
     * The Cookie used to store the session id on the client, or options used
     * to automatically create one.
     */
    cookie?: SessionIdStorageStrategy["cookie"];
}
/**
 * Creates and returns a simple in-memory SessionStorage object, mostly useful
 * for testing and as a reference implementation.
 *
 * Note: This storage does not scale beyond a single process, so it is not
 * suitable for most production scenarios.
 */
declare function createMemorySessionStorage<Data = SessionData, FlashData = Data>({ cookie }?: MemorySessionStorageOptions): SessionStorage<Data, FlashData>;

type DevServerHooks = {
    getCriticalCss?: (build: ServerBuild, pathname: string) => Promise<string | undefined>;
    processRequestError?: (error: unknown) => void;
};
declare function setDevServerHooks(devServerHooks: DevServerHooks): void;

declare function deserializeErrors(errors: RouterState["errors"]): RouterState["errors"];

type RemixErrorBoundaryProps = React.PropsWithChildren<{
    location: Location;
    isOutsideRemixApp?: boolean;
    error?: Error;
}>;
type RemixErrorBoundaryState = {
    error: null | Error;
    location: Location;
};
declare class RemixErrorBoundary extends React.Component<RemixErrorBoundaryProps, RemixErrorBoundaryState> {
    constructor(props: RemixErrorBoundaryProps);
    static getDerivedStateFromError(error: Error): {
        error: Error;
    };
    static getDerivedStateFromProps(props: RemixErrorBoundaryProps, state: RemixErrorBoundaryState): {
        error: Error | null;
        location: Location<any>;
    };
    render(): string | number | boolean | Iterable<React.ReactNode> | React.JSX.Element | null | undefined;
}

export { ActionFunction, ActionFunctionArgs, AppLoadContext$1 as AppLoadContext, Blocker, BlockerFunction, ClientActionFunction, ClientLoaderFunction, type Cookie, type CookieOptions, type CookieSignatureOptions, type CreateRequestHandlerFunction, Router as DataRouter, DataStrategyFunction, EntryContext, type FlashSessionData, type HandleDataRequestFunction, type HandleDocumentRequestFunction, type HandleErrorFunction, type HeadersArgs, type HeadersFunction, HydrationState, IndexRouteObject, InitialEntry, type IsCookieFunction, type IsSessionFunction, LinksFunction, LoaderFunction, LoaderFunctionArgs, Location, MetaFunction, type NavigateFunction, NavigateOptions, Navigation, Action as NavigationType, NonIndexRouteObject, ParamParseKey, Params, Path, PathMatch, PathPattern, RelativeRoutingType, type RequestHandler, RevalidationState, RouteObject, RouterState, type RoutesTestStubProps, type ServerBuild, type ServerEntryModule, ServerRouter, type ServerRouterProps, type Session, type SessionData, type SessionIdStorageStrategy, type SessionStorage, StaticHandler, StaticHandlerContext, StaticRouter, type StaticRouterProps, StaticRouterProvider, type StaticRouterProviderProps, To, UIMatch, AssetsManifest as UNSAFE_AssetsManifest, RemixErrorBoundary as UNSAFE_RemixErrorBoundary, RouteModules as UNSAFE_RouteModules, ServerMode as UNSAFE_ServerMode, SingleFetchRedirectSymbol as UNSAFE_SingleFetchRedirectSymbol, decodeViaTurboStream as UNSAFE_decodeViaTurboStream, deserializeErrors as UNSAFE_deserializeErrors, getSingleFetchDataStrategy as UNSAFE_getSingleFetchDataStrategy, createCookie, createCookieSessionStorage, createMemorySessionStorage, createRequestHandler, createRoutesStub, createSession, createSessionStorage, createStaticHandler, createStaticRouter, isCookie, isSession, setDevServerHooks as unstable_setDevServerHooks, useActionData, useAsyncError, useAsyncValue, useBlocker, useHref, useInRouterContext, useLoaderData, useLocation, useMatch, useMatches, useNavigate, useNavigation, useNavigationType, useOutlet, useOutletContext, useParams, useResolvedPath, useRevalidator, useRouteError, useRouteLoaderData, useRoutes };
