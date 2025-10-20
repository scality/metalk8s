import * as React from 'react';
import { ComponentType, ReactElement } from 'react';

/**
 * An augmentable interface users can modify in their app-code to opt into
 * future-flag-specific types
 */
interface Future {
}
type MiddlewareEnabled = Future extends {
    unstable_middleware: infer T extends boolean;
} ? T : false;

/**
 * Actions represent the type of change to a location value.
 */
declare enum Action {
    /**
     * A POP indicates a change to an arbitrary index in the history stack, such
     * as a back or forward navigation. It does not describe the direction of the
     * navigation, only that the current index changed.
     *
     * Note: This is the default action for newly created history objects.
     */
    Pop = "POP",
    /**
     * A PUSH indicates a new entry being added to the history stack, such as when
     * a link is clicked and a new page loads. When this happens, all subsequent
     * entries in the stack are lost.
     */
    Push = "PUSH",
    /**
     * A REPLACE indicates the entry at the current index in the history stack
     * being replaced by a new one.
     */
    Replace = "REPLACE"
}
/**
 * The pathname, search, and hash values of a URL.
 */
interface Path {
    /**
     * A URL pathname, beginning with a /.
     */
    pathname: string;
    /**
     * A URL search string, beginning with a ?.
     */
    search: string;
    /**
     * A URL fragment identifier, beginning with a #.
     */
    hash: string;
}
/**
 * An entry in a history stack. A location contains information about the
 * URL path, as well as possibly some arbitrary state and a key.
 */
interface Location<State = any> extends Path {
    /**
     * A value of arbitrary data associated with this location.
     */
    state: State;
    /**
     * A unique string associated with this location. May be used to safely store
     * and retrieve data in some other storage API, like `localStorage`.
     *
     * Note: This value is always "default" on the initial location.
     */
    key: string;
}
/**
 * A change to the current location.
 */
interface Update {
    /**
     * The action that triggered the change.
     */
    action: Action;
    /**
     * The new location.
     */
    location: Location;
    /**
     * The delta between this location and the former location in the history stack
     */
    delta: number | null;
}
/**
 * A function that receives notifications about location changes.
 */
interface Listener {
    (update: Update): void;
}
/**
 * Describes a location that is the destination of some navigation used in
 * {@link Link}, {@link useNavigate}, etc.
 */
type To = string | Partial<Path>;
/**
 * A history is an interface to the navigation stack. The history serves as the
 * source of truth for the current location, as well as provides a set of
 * methods that may be used to change it.
 *
 * It is similar to the DOM's `window.history` object, but with a smaller, more
 * focused API.
 */
interface History {
    /**
     * The last action that modified the current location. This will always be
     * Action.Pop when a history instance is first created. This value is mutable.
     */
    readonly action: Action;
    /**
     * The current location. This value is mutable.
     */
    readonly location: Location;
    /**
     * Returns a valid href for the given `to` value that may be used as
     * the value of an <a href> attribute.
     *
     * @param to - The destination URL
     */
    createHref(to: To): string;
    /**
     * Returns a URL for the given `to` value
     *
     * @param to - The destination URL
     */
    createURL(to: To): URL;
    /**
     * Encode a location the same way window.history would do (no-op for memory
     * history) so we ensure our PUSH/REPLACE navigations for data routers
     * behave the same as POP
     *
     * @param to Unencoded path
     */
    encodeLocation(to: To): Path;
    /**
     * Pushes a new location onto the history stack, increasing its length by one.
     * If there were any entries in the stack after the current one, they are
     * lost.
     *
     * @param to - The new URL
     * @param state - Data to associate with the new location
     */
    push(to: To, state?: any): void;
    /**
     * Replaces the current location in the history stack with a new one.  The
     * location that was replaced will no longer be available.
     *
     * @param to - The new URL
     * @param state - Data to associate with the new location
     */
    replace(to: To, state?: any): void;
    /**
     * Navigates `n` entries backward/forward in the history stack relative to the
     * current index. For example, a "back" navigation would use go(-1).
     *
     * @param delta - The delta in the stack index
     */
    go(delta: number): void;
    /**
     * Sets up a listener that will be called whenever the current location
     * changes.
     *
     * @param listener - A function that will be called when the location changes
     * @returns unlisten - A function that may be used to stop listening
     */
    listen(listener: Listener): () => void;
}
/**
 * A user-supplied object that describes a location. Used when providing
 * entries to `createMemoryHistory` via its `initialEntries` option.
 */
type InitialEntry = string | Partial<Location>;
/**
 * A browser history stores the current location in regular URLs in a web
 * browser environment. This is the standard for most web apps and provides the
 * cleanest URLs the browser's address bar.
 *
 * @see https://github.com/remix-run/history/tree/main/docs/api-reference.md#browserhistory
 */
interface BrowserHistory extends UrlHistory {
}
type BrowserHistoryOptions = UrlHistoryOptions;
/**
 * Browser history stores the location in regular URLs. This is the standard for
 * most web apps, but it requires some configuration on the server to ensure you
 * serve the same app at multiple URLs.
 *
 * @see https://github.com/remix-run/history/tree/main/docs/api-reference.md#createbrowserhistory
 */
declare function createBrowserHistory(options?: BrowserHistoryOptions): BrowserHistory;
/**
 * @private
 */
declare function invariant(value: boolean, message?: string): asserts value;
declare function invariant<T>(value: T | null | undefined, message?: string): asserts value is T;
/**
 * Creates a string URL path from the given pathname, search, and hash components.
 *
 * @category Utils
 */
declare function createPath({ pathname, search, hash, }: Partial<Path>): string;
/**
 * Parses a string URL path into its separate pathname, search, and hash components.
 *
 * @category Utils
 */
declare function parsePath(path: string): Partial<Path>;
interface UrlHistory extends History {
}
type UrlHistoryOptions = {
    window?: Window;
    v5Compat?: boolean;
};

type MaybePromise<T> = T | Promise<T>;
/**
 * Map of routeId -> data returned from a loader/action/error
 */
interface RouteData {
    [routeId: string]: any;
}
type LowerCaseFormMethod = "get" | "post" | "put" | "patch" | "delete";
type UpperCaseFormMethod = Uppercase<LowerCaseFormMethod>;
/**
 * Users can specify either lowercase or uppercase form methods on `<Form>`,
 * useSubmit(), `<fetcher.Form>`, etc.
 */
type HTMLFormMethod = LowerCaseFormMethod | UpperCaseFormMethod;
/**
 * Active navigation/fetcher form methods are exposed in uppercase on the
 * RouterState. This is to align with the normalization done via fetch().
 */
type FormMethod = UpperCaseFormMethod;
type FormEncType = "application/x-www-form-urlencoded" | "multipart/form-data" | "application/json" | "text/plain";
type JsonObject = {
    [Key in string]: JsonValue;
} & {
    [Key in string]?: JsonValue | undefined;
};
type JsonArray = JsonValue[] | readonly JsonValue[];
type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonArray;
/**
 * @private
 * Internal interface to pass around for action submissions, not intended for
 * external consumption
 */
type Submission = {
    formMethod: FormMethod;
    formAction: string;
    formEncType: FormEncType;
    formData: FormData;
    json: undefined;
    text: undefined;
} | {
    formMethod: FormMethod;
    formAction: string;
    formEncType: FormEncType;
    formData: undefined;
    json: JsonValue;
    text: undefined;
} | {
    formMethod: FormMethod;
    formAction: string;
    formEncType: FormEncType;
    formData: undefined;
    json: undefined;
    text: string;
};
/**
 * A context instance used as the key for the `get`/`set` methods of a
 * {@link unstable_RouterContextProvider}. Accepts an optional default
 * value to be returned if no value has been set.
 */
interface unstable_RouterContext<T = unknown> {
    defaultValue?: T;
}
/**
 * Creates a type-safe {@link unstable_RouterContext} object that can be used to
 * store and retrieve arbitrary values in [`action`](../../start/framework/route-module#action)s,
 * [`loader`](../../start/framework/route-module#loader)s, and [middleware](../../how-to/middleware).
 * Similar to React's [`createContext`](https://react.dev/reference/react/createContext),
 * but specifically designed for React Router's request/response lifecycle.
 *
 * If a `defaultValue` is provided, it will be returned from `context.get()`
 * when no value has been set for the context. Otherwise, reading this context
 * when no value has been set will throw an error.
 *
 * ```tsx filename=app/context.ts
 * import { unstable_createContext } from "react-router";
 *
 * // Create a context for user data
 * export const userContext =
 *   unstable_createContext<User | null>(null);
 * ```
 *
 * ```tsx filename=app/middleware/auth.ts
 * import { getUserFromSession } from "~/auth.server";
 * import { userContext } from "~/context";
 *
 * export const authMiddleware = async ({
 *   context,
 *   request,
 * }) => {
 *   const user = await getUserFromSession(request);
 *   context.set(userContext, user);
 * };
 * ```
 *
 * ```tsx filename=app/routes/profile.tsx
 * import { userContext } from "~/context";
 *
 * export async function loader({
 *   context,
 * }: Route.LoaderArgs) {
 *   const user = context.get(userContext);
 *
 *   if (!user) {
 *     throw new Response("Unauthorized", { status: 401 });
 *   }
 *
 *   return { user };
 * }
 * ```
 *
 * @public
 * @category Utils
 * @mode framework
 * @mode data
 * @param defaultValue An optional default value for the context. This value
 * will be returned if no value has been set for this context.
 * @returns A {@link unstable_RouterContext} object that can be used with
 * `context.get()` and `context.set()` in [`action`](../../start/framework/route-module#action)s,
 * [`loader`](../../start/framework/route-module#loader)s, and [middleware](../../how-to/middleware).
 */
declare function unstable_createContext<T>(defaultValue?: T): unstable_RouterContext<T>;
/**
 * Provides methods for writing/reading values in application context in a
 * type-safe way. Primarily for usage with [middleware](../../how-to/middleware).
 *
 * @example
 * import {
 *   unstable_createContext,
 *   unstable_RouterContextProvider
 * } from "react-router";
 *
 * const userContext = unstable_createContext<User | null>(null);
 * const contextProvider = new unstable_RouterContextProvider();
 * contextProvider.set(userContext, getUser());
 * //                               ^ Type-safe
 * const user = contextProvider.get(userContext);
 * //    ^ User
 *
 * @public
 * @category Utils
 * @mode framework
 * @mode data
 */
declare class unstable_RouterContextProvider {
    #private;
    /**
     * Create a new `unstable_RouterContextProvider` instance
     * @param init An optional initial context map to populate the provider with
     */
    constructor(init?: Map<unstable_RouterContext, unknown>);
    /**
     * Access a value from the context. If no value has been set for the context,
     * it will return the context's `defaultValue` if provided, or throw an error
     * if no `defaultValue` was set.
     * @param context The context to get the value for
     * @returns The value for the context, or the context's `defaultValue` if no
     * value was set
     */
    get<T>(context: unstable_RouterContext<T>): T;
    /**
     * Set a value for the context. If the context already has a value set, this
     * will overwrite it.
     *
     * @param context The context to set the value for
     * @param value The value to set for the context
     * @returns {void}
     */
    set<C extends unstable_RouterContext>(context: C, value: C extends unstable_RouterContext<infer T> ? T : never): void;
}
type DefaultContext = MiddlewareEnabled extends true ? Readonly<unstable_RouterContextProvider> : any;
/**
 * @private
 * Arguments passed to route loader/action functions.  Same for now but we keep
 * this as a private implementation detail in case they diverge in the future.
 */
interface DataFunctionArgs<Context> {
    /** A {@link https://developer.mozilla.org/en-US/docs/Web/API/Request Fetch Request instance} which you can use to read headers (like cookies, and {@link https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams URLSearchParams} from the request. */
    request: Request;
    /**
     * {@link https://reactrouter.com/start/framework/routing#dynamic-segments Dynamic route params} for the current route.
     * @example
     * // app/routes.ts
     * route("teams/:teamId", "./team.tsx"),
     *
     * // app/team.tsx
     * export function loader({
     *   params,
     * }: Route.LoaderArgs) {
     *   params.teamId;
     *   //        ^ string
     * }
     */
    params: Params;
    /**
     * This is the context passed in to your server adapter's getLoadContext() function.
     * It's a way to bridge the gap between the adapter's request/response API with your React Router app.
     * It is only applicable if you are using a custom server adapter.
     */
    context: Context;
}
/**
 * Route middleware `next` function to call downstream handlers and then complete
 * middlewares from the bottom-up
 */
interface unstable_MiddlewareNextFunction<Result = unknown> {
    (): Promise<Result>;
}
/**
 * Route middleware function signature.  Receives the same "data" arguments as a
 * `loader`/`action` (`request`, `params`, `context`) as the first parameter and
 * a `next` function as the second parameter which will call downstream handlers
 * and then complete middlewares from the bottom-up
 */
type unstable_MiddlewareFunction<Result = unknown> = (args: DataFunctionArgs<Readonly<unstable_RouterContextProvider>>, next: unstable_MiddlewareNextFunction<Result>) => MaybePromise<Result | void>;
/**
 * Arguments passed to loader functions
 */
interface LoaderFunctionArgs<Context = DefaultContext> extends DataFunctionArgs<Context> {
}
/**
 * Arguments passed to action functions
 */
interface ActionFunctionArgs<Context = DefaultContext> extends DataFunctionArgs<Context> {
}
/**
 * Loaders and actions can return anything
 */
type DataFunctionValue = unknown;
type DataFunctionReturnValue = MaybePromise<DataFunctionValue>;
/**
 * Route loader function signature
 */
type LoaderFunction<Context = DefaultContext> = {
    (args: LoaderFunctionArgs<Context>, handlerCtx?: unknown): DataFunctionReturnValue;
} & {
    hydrate?: boolean;
};
/**
 * Route action function signature
 */
interface ActionFunction<Context = DefaultContext> {
    (args: ActionFunctionArgs<Context>, handlerCtx?: unknown): DataFunctionReturnValue;
}
/**
 * Arguments passed to shouldRevalidate function
 */
interface ShouldRevalidateFunctionArgs {
    /** This is the url the navigation started from. You can compare it with `nextUrl` to decide if you need to revalidate this route's data. */
    currentUrl: URL;
    /** These are the {@link https://reactrouter.com/start/framework/routing#dynamic-segments dynamic route params} from the URL that can be compared to the `nextParams` to decide if you need to reload or not. Perhaps you're using only a partial piece of the param for data loading, you don't need to revalidate if a superfluous part of the param changed. */
    currentParams: AgnosticDataRouteMatch["params"];
    /** In the case of navigation, this the URL the user is requesting. Some revalidations are not navigation, so it will simply be the same as currentUrl. */
    nextUrl: URL;
    /** In the case of navigation, these are the {@link https://reactrouter.com/start/framework/routing#dynamic-segments dynamic route params}  from the next location the user is requesting. Some revalidations are not navigation, so it will simply be the same as currentParams. */
    nextParams: AgnosticDataRouteMatch["params"];
    /** The method (probably `"GET"` or `"POST"`) used in the form submission that triggered the revalidation. */
    formMethod?: Submission["formMethod"];
    /** The form action (`<Form action="/somewhere">`) that triggered the revalidation. */
    formAction?: Submission["formAction"];
    /** The form encType (`<Form encType="application/x-www-form-urlencoded">) used in the form submission that triggered the revalidation*/
    formEncType?: Submission["formEncType"];
    /** The form submission data when the form's encType is `text/plain` */
    text?: Submission["text"];
    /** The form submission data when the form's encType is `application/x-www-form-urlencoded` or `multipart/form-data` */
    formData?: Submission["formData"];
    /** The form submission data when the form's encType is `application/json` */
    json?: Submission["json"];
    /** The status code of the action response */
    actionStatus?: number;
    /**
     * When a submission causes the revalidation this will be the result of the action—either action data or an error if the action failed. It's common to include some information in the action result to instruct shouldRevalidate to revalidate or not.
     *
     * @example
     * export async function action() {
     *   await saveSomeStuff();
     *   return { ok: true };
     * }
     *
     * export function shouldRevalidate({
     *   actionResult,
     * }) {
     *   if (actionResult?.ok) {
     *     return false;
     *   }
     *   return true;
     * }
     */
    actionResult?: any;
    /**
     * By default, React Router doesn't call every loader all the time. There are reliable optimizations it can make by default. For example, only loaders with changing params are called. Consider navigating from the following URL to the one below it:
     *
     * /projects/123/tasks/abc
     * /projects/123/tasks/def
     * React Router will only call the loader for tasks/def because the param for projects/123 didn't change.
     *
     * It's safest to always return defaultShouldRevalidate after you've done your specific optimizations that return false, otherwise your UI might get out of sync with your data on the server.
     */
    defaultShouldRevalidate: boolean;
}
/**
 * Route shouldRevalidate function signature.  This runs after any submission
 * (navigation or fetcher), so we flatten the navigation/fetcher submission
 * onto the arguments.  It shouldn't matter whether it came from a navigation
 * or a fetcher, what really matters is the URLs and the formData since loaders
 * have to re-run based on the data models that were potentially mutated.
 */
interface ShouldRevalidateFunction {
    (args: ShouldRevalidateFunctionArgs): boolean;
}
interface DataStrategyMatch extends AgnosticRouteMatch<string, AgnosticDataRouteObject> {
    /**
     * @private
     */
    _lazyPromises?: {
        middleware: Promise<void> | undefined;
        handler: Promise<void> | undefined;
        route: Promise<void> | undefined;
    };
    /**
     * A boolean value indicating whether this route handler should be called in
     * this pass.
     *
     * The `matches` array always includes _all_ matched routes even when only
     * _some_ route handlers need to be called so that things like middleware can
     * be implemented.
     *
     * `shouldLoad` is usually only interesting if you are skipping the route
     * handler entirely and implementing custom handler logic - since it lets you
     * determine if that custom logic should run for this route or not.
     *
     * For example:
     *  - If you are on `/parent/child/a` and you navigate to `/parent/child/b` -
     *    you'll get an array of three matches (`[parent, child, b]`), but only `b`
     *    will have `shouldLoad=true` because the data for `parent` and `child` is
     *    already loaded
     *  - If you are on `/parent/child/a` and you submit to `a`'s [`action`](https://reactrouter.com/docs/start/data/route-object#action),
     *    then only `a` will have `shouldLoad=true` for the action execution of
     *    `dataStrategy`
     *  - After the [`action`](https://reactrouter.com/docs/start/data/route-object#action),
     *    `dataStrategy` will be called again for the [`loader`](https://reactrouter.com/docs/start/data/route-object#loader)
     *    revalidation, and all matches will have `shouldLoad=true` (assuming no
     *    custom `shouldRevalidate` implementations)
     */
    shouldLoad: boolean;
    unstable_shouldRevalidateArgs: ShouldRevalidateFunctionArgs | null;
    unstable_shouldCallHandler(defaultShouldRevalidate?: boolean): boolean;
    /**
     * An async function that will resolve any `route.lazy` implementations and
     * execute the route's handler (if necessary), returning a {@link DataStrategyResult}
     *
     * - Calling `match.resolve` does not mean you're calling the
     *   [`action`](https://reactrouter.com/docs/start/data/route-object#action)/[`loader`](https://reactrouter.com/docs/start/data/route-object#loader)
     *   (the "handler") - `resolve` will only call the `handler` internally if
     *   needed _and_ if you don't pass your own `handlerOverride` function parameter
     * - It is safe to call `match.resolve` for all matches, even if they have
     *   `shouldLoad=false`, and it will no-op if no loading is required
     * - You should generally always call `match.resolve()` for `shouldLoad:true`
     *   routes to ensure that any `route.lazy` implementations are processed
     * - See the examples below for how to implement custom handler execution via
     *   `match.resolve`
     */
    resolve: (handlerOverride?: (handler: (ctx?: unknown) => DataFunctionReturnValue) => DataFunctionReturnValue) => Promise<DataStrategyResult>;
}
interface DataStrategyFunctionArgs<Context = DefaultContext> extends DataFunctionArgs<Context> {
    /**
     * Matches for this route extended with Data strategy APIs
     */
    matches: DataStrategyMatch[];
    unstable_runClientMiddleware: (cb: DataStrategyFunction<Context>) => Promise<Record<string, DataStrategyResult>>;
    /**
     * The key of the fetcher we are calling `dataStrategy` for, otherwise `null`
     * for navigational executions
     */
    fetcherKey: string | null;
}
/**
 * Result from a loader or action called via dataStrategy
 */
interface DataStrategyResult {
    type: "data" | "error";
    result: unknown;
}
interface DataStrategyFunction<Context = DefaultContext> {
    (args: DataStrategyFunctionArgs<Context>): Promise<Record<string, DataStrategyResult>>;
}
type AgnosticPatchRoutesOnNavigationFunctionArgs<O extends AgnosticRouteObject = AgnosticRouteObject, M extends AgnosticRouteMatch = AgnosticRouteMatch> = {
    signal: AbortSignal;
    path: string;
    matches: M[];
    fetcherKey: string | undefined;
    patch: (routeId: string | null, children: O[]) => void;
};
type AgnosticPatchRoutesOnNavigationFunction<O extends AgnosticRouteObject = AgnosticRouteObject, M extends AgnosticRouteMatch = AgnosticRouteMatch> = (opts: AgnosticPatchRoutesOnNavigationFunctionArgs<O, M>) => MaybePromise<void>;
/**
 * Function provided by the framework-aware layers to set any framework-specific
 * properties from framework-agnostic properties
 */
interface MapRoutePropertiesFunction {
    (route: AgnosticRouteObject): {
        hasErrorBoundary: boolean;
    } & Record<string, any>;
}
/**
 * Keys we cannot change from within a lazy object. We spread all other keys
 * onto the route. Either they're meaningful to the router, or they'll get
 * ignored.
 */
type UnsupportedLazyRouteObjectKey = "lazy" | "caseSensitive" | "path" | "id" | "index" | "children";
/**
 * Keys we cannot change from within a lazy() function. We spread all other keys
 * onto the route. Either they're meaningful to the router, or they'll get
 * ignored.
 */
type UnsupportedLazyRouteFunctionKey = UnsupportedLazyRouteObjectKey | "unstable_middleware";
/**
 * lazy object to load route properties, which can add non-matching
 * related properties to a route
 */
type LazyRouteObject<R extends AgnosticRouteObject> = {
    [K in keyof R as K extends UnsupportedLazyRouteObjectKey ? never : K]?: () => Promise<R[K] | null | undefined>;
};
/**
 * lazy() function to load a route definition, which can add non-matching
 * related properties to a route
 */
interface LazyRouteFunction<R extends AgnosticRouteObject> {
    (): Promise<Omit<R, UnsupportedLazyRouteFunctionKey> & Partial<Record<UnsupportedLazyRouteFunctionKey, never>>>;
}
type LazyRouteDefinition<R extends AgnosticRouteObject> = LazyRouteObject<R> | LazyRouteFunction<R>;
/**
 * Base RouteObject with common props shared by all types of routes
 */
type AgnosticBaseRouteObject = {
    caseSensitive?: boolean;
    path?: string;
    id?: string;
    unstable_middleware?: unstable_MiddlewareFunction[];
    loader?: LoaderFunction | boolean;
    action?: ActionFunction | boolean;
    hasErrorBoundary?: boolean;
    shouldRevalidate?: ShouldRevalidateFunction;
    handle?: any;
    lazy?: LazyRouteDefinition<AgnosticBaseRouteObject>;
};
/**
 * Index routes must not have children
 */
type AgnosticIndexRouteObject = AgnosticBaseRouteObject & {
    children?: undefined;
    index: true;
};
/**
 * Non-index routes may have children, but cannot have index
 */
type AgnosticNonIndexRouteObject = AgnosticBaseRouteObject & {
    children?: AgnosticRouteObject[];
    index?: false;
};
/**
 * A route object represents a logical route, with (optionally) its child
 * routes organized in a tree-like structure.
 */
type AgnosticRouteObject = AgnosticIndexRouteObject | AgnosticNonIndexRouteObject;
type AgnosticDataIndexRouteObject = AgnosticIndexRouteObject & {
    id: string;
};
type AgnosticDataNonIndexRouteObject = AgnosticNonIndexRouteObject & {
    children?: AgnosticDataRouteObject[];
    id: string;
};
/**
 * A data route object, which is just a RouteObject with a required unique ID
 */
type AgnosticDataRouteObject = AgnosticDataIndexRouteObject | AgnosticDataNonIndexRouteObject;
type RouteManifest<R = AgnosticDataRouteObject> = Record<string, R | undefined>;
type Regex_az = "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" | "i" | "j" | "k" | "l" | "m" | "n" | "o" | "p" | "q" | "r" | "s" | "t" | "u" | "v" | "w" | "x" | "y" | "z";
type Regez_AZ = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | "K" | "L" | "M" | "N" | "O" | "P" | "Q" | "R" | "S" | "T" | "U" | "V" | "W" | "X" | "Y" | "Z";
type Regex_09 = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
type Regex_w = Regex_az | Regez_AZ | Regex_09 | "_";
type ParamChar = Regex_w | "-";
type RegexMatchPlus<CharPattern extends string, T extends string> = T extends `${infer First}${infer Rest}` ? First extends CharPattern ? RegexMatchPlus<CharPattern, Rest> extends never ? First : `${First}${RegexMatchPlus<CharPattern, Rest>}` : never : never;
type _PathParam<Path extends string> = Path extends `${infer L}/${infer R}` ? _PathParam<L> | _PathParam<R> : Path extends `:${infer Param}` ? Param extends `${infer Optional}?${string}` ? RegexMatchPlus<ParamChar, Optional> : RegexMatchPlus<ParamChar, Param> : never;
type PathParam<Path extends string> = Path extends "*" | "/*" ? "*" : Path extends `${infer Rest}/*` ? "*" | _PathParam<Rest> : _PathParam<Path>;
type ParamParseKey<Segment extends string> = [
    PathParam<Segment>
] extends [never] ? string : PathParam<Segment>;
/**
 * The parameters that were parsed from the URL path.
 */
type Params<Key extends string = string> = {
    readonly [key in Key]: string | undefined;
};
/**
 * A RouteMatch contains info about how a route matched a URL.
 */
interface AgnosticRouteMatch<ParamKey extends string = string, RouteObjectType extends AgnosticRouteObject = AgnosticRouteObject> {
    /**
     * The names and values of dynamic parameters in the URL.
     */
    params: Params<ParamKey>;
    /**
     * The portion of the URL pathname that was matched.
     */
    pathname: string;
    /**
     * The portion of the URL pathname that was matched before child routes.
     */
    pathnameBase: string;
    /**
     * The route object that was used to match.
     */
    route: RouteObjectType;
}
interface AgnosticDataRouteMatch extends AgnosticRouteMatch<string, AgnosticDataRouteObject> {
}
/**
 * Matches the given routes to a location and returns the match data.
 *
 * @example
 * import { matchRoutes } from "react-router";
 *
 * let routes = [{
 *   path: "/",
 *   Component: Root,
 *   children: [{
 *     path: "dashboard",
 *     Component: Dashboard,
 *   }]
 * }];
 *
 * matchRoutes(routes, "/dashboard"); // [rootMatch, dashboardMatch]
 *
 * @public
 * @category Utils
 * @param routes The array of route objects to match against.
 * @param locationArg The location to match against, either a string path or a
 * partial {@link Location} object
 * @param basename Optional base path to strip from the location before matching.
 * Defaults to `/`.
 * @returns An array of matched routes, or `null` if no matches were found.
 */
declare function matchRoutes<RouteObjectType extends AgnosticRouteObject = AgnosticRouteObject>(routes: RouteObjectType[], locationArg: Partial<Location> | string, basename?: string): AgnosticRouteMatch<string, RouteObjectType>[] | null;
interface UIMatch<Data = unknown, Handle = unknown> {
    id: string;
    pathname: string;
    /**
     * {@link https://reactrouter.com/start/framework/routing#dynamic-segments Dynamic route params} for the matched route.
     */
    params: AgnosticRouteMatch["params"];
    /**
     * The return value from the matched route's loader or clientLoader. This might
     * be `undefined` if this route's `loader` (or a deeper route's `loader`) threw
     * an error and we're currently displaying an `ErrorBoundary`.
     *
     * @deprecated Use `UIMatch.loaderData` instead
     */
    data: Data | undefined;
    /**
     * The return value from the matched route's loader or clientLoader. This might
     * be `undefined` if this route's `loader` (or a deeper route's `loader`) threw
     * an error and we're currently displaying an `ErrorBoundary`.
     */
    loaderData: Data | undefined;
    /**
     * The {@link https://reactrouter.com/start/framework/route-module#handle handle object}
     * exported from the matched route module
     */
    handle: Handle;
}
/**
 * Returns a path with params interpolated.
 *
 * @example
 * import { generatePath } from "react-router";
 *
 * generatePath("/users/:id", { id: "123" }); // "/users/123"
 *
 * @public
 * @category Utils
 * @param originalPath The original path to generate.
 * @param params The parameters to interpolate into the path.
 * @returns The generated path with parameters interpolated.
 */
declare function generatePath<Path extends string>(originalPath: Path, params?: {
    [key in PathParam<Path>]: string | null;
}): string;
/**
 * Used to match on some portion of a URL pathname.
 */
interface PathPattern<Path extends string = string> {
    /**
     * A string to match against a URL pathname. May contain `:id`-style segments
     * to indicate placeholders for dynamic parameters. It May also end with `/*`
     * to indicate matching the rest of the URL pathname.
     */
    path: Path;
    /**
     * Should be `true` if the static portions of the `path` should be matched in
     * the same case.
     */
    caseSensitive?: boolean;
    /**
     * Should be `true` if this pattern should match the entire URL pathname.
     */
    end?: boolean;
}
/**
 * Contains info about how a {@link PathPattern} matched on a URL pathname.
 */
interface PathMatch<ParamKey extends string = string> {
    /**
     * The names and values of dynamic parameters in the URL.
     */
    params: Params<ParamKey>;
    /**
     * The portion of the URL pathname that was matched.
     */
    pathname: string;
    /**
     * The portion of the URL pathname that was matched before child routes.
     */
    pathnameBase: string;
    /**
     * The pattern that was used to match.
     */
    pattern: PathPattern;
}
/**
 * Performs pattern matching on a URL pathname and returns information about
 * the match.
 *
 * @public
 * @category Utils
 * @param pattern The pattern to match against the URL pathname. This can be a
 * string or a {@link PathPattern} object. If a string is provided, it will be
 * treated as a pattern with `caseSensitive` set to `false` and `end` set to
 * `true`.
 * @param pathname The URL pathname to match against the pattern.
 * @returns A path match object if the pattern matches the pathname,
 * or `null` if it does not match.
 */
declare function matchPath<ParamKey extends ParamParseKey<Path>, Path extends string>(pattern: PathPattern<Path> | Path, pathname: string): PathMatch<ParamKey> | null;
/**
 * Returns a resolved {@link Path} object relative to the given pathname.
 *
 * @public
 * @category Utils
 * @param to The path to resolve, either a string or a partial {@link Path}
 * object.
 * @param fromPathname The pathname to resolve the path from. Defaults to `/`.
 * @returns A {@link Path} object with the resolved pathname, search, and hash.
 */
declare function resolvePath(to: To, fromPathname?: string): Path;
declare class DataWithResponseInit<D> {
    type: string;
    data: D;
    init: ResponseInit | null;
    constructor(data: D, init?: ResponseInit);
}
/**
 * Create "responses" that contain `headers`/`status` without forcing
 * serialization into an actual [`Response`](https://developer.mozilla.org/en-US/docs/Web/API/Response)
 *
 * @example
 * import { data } from "react-router";
 *
 * export async function action({ request }: Route.ActionArgs) {
 *   let formData = await request.formData();
 *   let item = await createItem(formData);
 *   return data(item, {
 *     headers: { "X-Custom-Header": "value" }
 *     status: 201,
 *   });
 * }
 *
 * @public
 * @category Utils
 * @mode framework
 * @mode data
 * @param data The data to be included in the response.
 * @param init The status code or a `ResponseInit` object to be included in the
 * response.
 * @returns A {@link DataWithResponseInit} instance containing the data and
 * response init.
 */
declare function data<D>(data: D, init?: number | ResponseInit): DataWithResponseInit<D>;
type RedirectFunction = (url: string, init?: number | ResponseInit) => Response;
/**
 * A redirect [`Response`](https://developer.mozilla.org/en-US/docs/Web/API/Response).
 * Sets the status code and the [`Location`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Location)
 * header. Defaults to [`302 Found`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/302).
 *
 * @example
 * import { redirect } from "react-router";
 *
 * export async function loader({ request }: Route.LoaderArgs) {
 *   if (!isLoggedIn(request))
 *     throw redirect("/login");
 *   }
 *
 *   // ...
 * }
 *
 * @public
 * @category Utils
 * @mode framework
 * @mode data
 * @param url The URL to redirect to.
 * @param init The status code or a `ResponseInit` object to be included in the
 * response.
 * @returns A [`Response`](https://developer.mozilla.org/en-US/docs/Web/API/Response)
 * object with the redirect status and [`Location`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Location)
 * header.
 */
declare const redirect: RedirectFunction;
/**
 * A redirect [`Response`](https://developer.mozilla.org/en-US/docs/Web/API/Response)
 * that will force a document reload to the new location. Sets the status code
 * and the [`Location`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Location)
 * header. Defaults to [`302 Found`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/302).
 *
 * ```tsx filename=routes/logout.tsx
 * import { redirectDocument } from "react-router";
 *
 * import { destroySession } from "../sessions.server";
 *
 * export async function action({ request }: Route.ActionArgs) {
 *   let session = await getSession(request.headers.get("Cookie"));
 *   return redirectDocument("/", {
 *     headers: { "Set-Cookie": await destroySession(session) }
 *   });
 * }
 * ```
 *
 * @public
 * @category Utils
 * @mode framework
 * @mode data
 * @param url The URL to redirect to.
 * @param init The status code or a `ResponseInit` object to be included in the
 * response.
 * @returns A [`Response`](https://developer.mozilla.org/en-US/docs/Web/API/Response)
 * object with the redirect status and [`Location`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Location)
 * header.
 */
declare const redirectDocument: RedirectFunction;
/**
 * A redirect [`Response`](https://developer.mozilla.org/en-US/docs/Web/API/Response)
 * that will perform a [`history.replaceState`](https://developer.mozilla.org/en-US/docs/Web/API/History/replaceState)
 * instead of a [`history.pushState`](https://developer.mozilla.org/en-US/docs/Web/API/History/pushState)
 * for client-side navigation redirects. Sets the status code and the [`Location`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Location)
 * header. Defaults to [`302 Found`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/302).
 *
 * @example
 * import { replace } from "react-router";
 *
 * export async function loader() {
 *   return replace("/new-location");
 * }
 *
 * @public
 * @category Utils
 * @mode framework
 * @mode data
 * @param url The URL to redirect to.
 * @param init The status code or a `ResponseInit` object to be included in the
 * response.
 * @returns A [`Response`](https://developer.mozilla.org/en-US/docs/Web/API/Response)
 * object with the redirect status and [`Location`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Location)
 * header.
 */
declare const replace: RedirectFunction;
type ErrorResponse = {
    status: number;
    statusText: string;
    data: any;
};
declare class ErrorResponseImpl implements ErrorResponse {
    status: number;
    statusText: string;
    data: any;
    private error?;
    private internal;
    constructor(status: number, statusText: string | undefined, data: any, internal?: boolean);
}
/**
 * Check if the given error is an {@link ErrorResponse} generated from a 4xx/5xx
 * [`Response`](https://developer.mozilla.org/en-US/docs/Web/API/Response)
 * thrown from an [`action`](../../start/framework/route-module#action)/[`loader`](../../start/framework/route-module#loader)
 *
 * @example
 * import { isRouteErrorResponse } from "react-router";
 *
 * export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
 *   if (isRouteErrorResponse(error)) {
 *     return (
 *       <>
 *         <p>Error: `${error.status}: ${error.statusText}`</p>
 *         <p>{error.data}</p>
 *       </>
 *     );
 *   }
 *
 *   return (
 *     <p>Error: {error instanceof Error ? error.message : "Unknown Error"}</p>
 *   );
 * }
 *
 * @public
 * @category Utils
 * @mode framework
 * @mode data
 * @param error The error to check.
 * @returns `true` if the error is an {@link ErrorResponse}, `false` otherwise.
 *
 */
declare function isRouteErrorResponse(error: any): error is ErrorResponse;

/**
 * A Router instance manages all navigation and data loading/mutations
 */
interface Router {
    /**
     * @private
     * PRIVATE - DO NOT USE
     *
     * Return the basename for the router
     */
    get basename(): RouterInit["basename"];
    /**
     * @private
     * PRIVATE - DO NOT USE
     *
     * Return the future config for the router
     */
    get future(): FutureConfig;
    /**
     * @private
     * PRIVATE - DO NOT USE
     *
     * Return the current state of the router
     */
    get state(): RouterState;
    /**
     * @private
     * PRIVATE - DO NOT USE
     *
     * Return the routes for this router instance
     */
    get routes(): AgnosticDataRouteObject[];
    /**
     * @private
     * PRIVATE - DO NOT USE
     *
     * Return the window associated with the router
     */
    get window(): RouterInit["window"];
    /**
     * @private
     * PRIVATE - DO NOT USE
     *
     * Initialize the router, including adding history listeners and kicking off
     * initial data fetches.  Returns a function to cleanup listeners and abort
     * any in-progress loads
     */
    initialize(): Router;
    /**
     * @private
     * PRIVATE - DO NOT USE
     *
     * Subscribe to router.state updates
     *
     * @param fn function to call with the new state
     */
    subscribe(fn: RouterSubscriber): () => void;
    /**
     * @private
     * PRIVATE - DO NOT USE
     *
     * Enable scroll restoration behavior in the router
     *
     * @param savedScrollPositions Object that will manage positions, in case
     *                             it's being restored from sessionStorage
     * @param getScrollPosition    Function to get the active Y scroll position
     * @param getKey               Function to get the key to use for restoration
     */
    enableScrollRestoration(savedScrollPositions: Record<string, number>, getScrollPosition: GetScrollPositionFunction, getKey?: GetScrollRestorationKeyFunction): () => void;
    /**
     * @private
     * PRIVATE - DO NOT USE
     *
     * Navigate forward/backward in the history stack
     * @param to Delta to move in the history stack
     */
    navigate(to: number): Promise<void>;
    /**
     * Navigate to the given path
     * @param to Path to navigate to
     * @param opts Navigation options (method, submission, etc.)
     */
    navigate(to: To | null, opts?: RouterNavigateOptions): Promise<void>;
    /**
     * @private
     * PRIVATE - DO NOT USE
     *
     * Trigger a fetcher load/submission
     *
     * @param key     Fetcher key
     * @param routeId Route that owns the fetcher
     * @param href    href to fetch
     * @param opts    Fetcher options, (method, submission, etc.)
     */
    fetch(key: string, routeId: string, href: string | null, opts?: RouterFetchOptions): Promise<void>;
    /**
     * @private
     * PRIVATE - DO NOT USE
     *
     * Trigger a revalidation of all current route loaders and fetcher loads
     */
    revalidate(): Promise<void>;
    /**
     * @private
     * PRIVATE - DO NOT USE
     *
     * Utility function to create an href for the given location
     * @param location
     */
    createHref(location: Location | URL): string;
    /**
     * @private
     * PRIVATE - DO NOT USE
     *
     * Utility function to URL encode a destination path according to the internal
     * history implementation
     * @param to
     */
    encodeLocation(to: To): Path;
    /**
     * @private
     * PRIVATE - DO NOT USE
     *
     * Get/create a fetcher for the given key
     * @param key
     */
    getFetcher<TData = any>(key: string): Fetcher<TData>;
    /**
     * @private
     * PRIVATE - DO NOT USE
     *
     * Delete the fetcher for a given key
     * @param key
     */
    deleteFetcher(key: string): void;
    /**
     * @private
     * PRIVATE - DO NOT USE
     *
     * Cleanup listeners and abort any in-progress loads
     */
    dispose(): void;
    /**
     * @private
     * PRIVATE - DO NOT USE
     *
     * Get a navigation blocker
     * @param key The identifier for the blocker
     * @param fn The blocker function implementation
     */
    getBlocker(key: string, fn: BlockerFunction): Blocker;
    /**
     * @private
     * PRIVATE - DO NOT USE
     *
     * Delete a navigation blocker
     * @param key The identifier for the blocker
     */
    deleteBlocker(key: string): void;
    /**
     * @private
     * PRIVATE DO NOT USE
     *
     * Patch additional children routes into an existing parent route
     * @param routeId The parent route id or a callback function accepting `patch`
     *                to perform batch patching
     * @param children The additional children routes
     * @param unstable_allowElementMutations Allow mutation or route elements on
     *                                       existing routes. Intended for RSC-usage
     *                                       only.
     */
    patchRoutes(routeId: string | null, children: AgnosticRouteObject[], unstable_allowElementMutations?: boolean): void;
    /**
     * @private
     * PRIVATE - DO NOT USE
     *
     * HMR needs to pass in-flight route updates to React Router
     * TODO: Replace this with granular route update APIs (addRoute, updateRoute, deleteRoute)
     */
    _internalSetRoutes(routes: AgnosticRouteObject[]): void;
    /**
     * @private
     * PRIVATE - DO NOT USE
     *
     * Cause subscribers to re-render.  This is used to force a re-render.
     */
    _internalSetStateDoNotUseOrYouWillBreakYourApp(state: Partial<RouterState>): void;
    /**
     * @private
     * PRIVATE - DO NOT USE
     *
     * Internal fetch AbortControllers accessed by unit tests
     */
    _internalFetchControllers: Map<string, AbortController>;
}
/**
 * State maintained internally by the router.  During a navigation, all states
 * reflect the "old" location unless otherwise noted.
 */
interface RouterState {
    /**
     * The action of the most recent navigation
     */
    historyAction: Action;
    /**
     * The current location reflected by the router
     */
    location: Location;
    /**
     * The current set of route matches
     */
    matches: AgnosticDataRouteMatch[];
    /**
     * Tracks whether we've completed our initial data load
     */
    initialized: boolean;
    /**
     * Current scroll position we should start at for a new view
     *  - number -> scroll position to restore to
     *  - false -> do not restore scroll at all (used during submissions/revalidations)
     *  - null -> don't have a saved position, scroll to hash or top of page
     */
    restoreScrollPosition: number | false | null;
    /**
     * Indicate whether this navigation should skip resetting the scroll position
     * if we are unable to restore the scroll position
     */
    preventScrollReset: boolean;
    /**
     * Tracks the state of the current navigation
     */
    navigation: Navigation;
    /**
     * Tracks any in-progress revalidations
     */
    revalidation: RevalidationState;
    /**
     * Data from the loaders for the current matches
     */
    loaderData: RouteData;
    /**
     * Data from the action for the current matches
     */
    actionData: RouteData | null;
    /**
     * Errors caught from loaders for the current matches
     */
    errors: RouteData | null;
    /**
     * Map of current fetchers
     */
    fetchers: Map<string, Fetcher>;
    /**
     * Map of current blockers
     */
    blockers: Map<string, Blocker>;
}
/**
 * Data that can be passed into hydrate a Router from SSR
 */
type HydrationState = Partial<Pick<RouterState, "loaderData" | "actionData" | "errors">>;
/**
 * Future flags to toggle new feature behavior
 */
interface FutureConfig {
    unstable_middleware: boolean;
}
/**
 * Initialization options for createRouter
 */
interface RouterInit {
    routes: AgnosticRouteObject[];
    history: History;
    basename?: string;
    unstable_getContext?: () => MaybePromise<unstable_RouterContextProvider>;
    mapRouteProperties?: MapRoutePropertiesFunction;
    future?: Partial<FutureConfig>;
    hydrationRouteProperties?: string[];
    hydrationData?: HydrationState;
    window?: Window;
    dataStrategy?: DataStrategyFunction;
    patchRoutesOnNavigation?: AgnosticPatchRoutesOnNavigationFunction;
}
/**
 * State returned from a server-side query() call
 */
interface StaticHandlerContext {
    basename: Router["basename"];
    location: RouterState["location"];
    matches: RouterState["matches"];
    loaderData: RouterState["loaderData"];
    actionData: RouterState["actionData"];
    errors: RouterState["errors"];
    statusCode: number;
    loaderHeaders: Record<string, Headers>;
    actionHeaders: Record<string, Headers>;
    _deepestRenderedBoundaryId?: string | null;
}
/**
 * A StaticHandler instance manages a singular SSR navigation/fetch event
 */
interface StaticHandler {
    dataRoutes: AgnosticDataRouteObject[];
    query(request: Request, opts?: {
        requestContext?: unknown;
        filterMatchesToLoad?: (match: AgnosticDataRouteMatch) => boolean;
        skipLoaderErrorBubbling?: boolean;
        skipRevalidation?: boolean;
        dataStrategy?: DataStrategyFunction<unknown>;
        unstable_generateMiddlewareResponse?: (query: (r: Request) => Promise<StaticHandlerContext | Response>) => MaybePromise<Response>;
    }): Promise<StaticHandlerContext | Response>;
    queryRoute(request: Request, opts?: {
        routeId?: string;
        requestContext?: unknown;
        dataStrategy?: DataStrategyFunction<unknown>;
        unstable_generateMiddlewareResponse?: (queryRoute: (r: Request) => Promise<Response>) => MaybePromise<Response>;
    }): Promise<any>;
}
type ViewTransitionOpts = {
    currentLocation: Location;
    nextLocation: Location;
};
/**
 * Subscriber function signature for changes to router state
 */
interface RouterSubscriber {
    (state: RouterState, opts: {
        deletedFetchers: string[];
        viewTransitionOpts?: ViewTransitionOpts;
        flushSync: boolean;
    }): void;
}
/**
 * Function signature for determining the key to be used in scroll restoration
 * for a given location
 */
interface GetScrollRestorationKeyFunction {
    (location: Location, matches: UIMatch[]): string | null;
}
/**
 * Function signature for determining the current scroll position
 */
interface GetScrollPositionFunction {
    (): number;
}
/**
 * - "route": relative to the route hierarchy so `..` means remove all segments
 * of the current route even if it has many. For example, a `route("posts/:id")`
 * would have both `:id` and `posts` removed from the url.
 * - "path": relative to the pathname so `..` means remove one segment of the
 * pathname. For example, a `route("posts/:id")` would have only `:id` removed
 * from the url.
 */
type RelativeRoutingType = "route" | "path";
type BaseNavigateOrFetchOptions = {
    preventScrollReset?: boolean;
    relative?: RelativeRoutingType;
    flushSync?: boolean;
};
type BaseNavigateOptions = BaseNavigateOrFetchOptions & {
    replace?: boolean;
    state?: any;
    fromRouteId?: string;
    viewTransition?: boolean;
};
type BaseSubmissionOptions = {
    formMethod?: HTMLFormMethod;
    formEncType?: FormEncType;
} & ({
    formData: FormData;
    body?: undefined;
} | {
    formData?: undefined;
    body: any;
});
/**
 * Options for a navigate() call for a normal (non-submission) navigation
 */
type LinkNavigateOptions = BaseNavigateOptions;
/**
 * Options for a navigate() call for a submission navigation
 */
type SubmissionNavigateOptions = BaseNavigateOptions & BaseSubmissionOptions;
/**
 * Options to pass to navigate() for a navigation
 */
type RouterNavigateOptions = LinkNavigateOptions | SubmissionNavigateOptions;
/**
 * Options for a fetch() load
 */
type LoadFetchOptions = BaseNavigateOrFetchOptions;
/**
 * Options for a fetch() submission
 */
type SubmitFetchOptions = BaseNavigateOrFetchOptions & BaseSubmissionOptions;
/**
 * Options to pass to fetch()
 */
type RouterFetchOptions = LoadFetchOptions | SubmitFetchOptions;
/**
 * Potential states for state.navigation
 */
type NavigationStates = {
    Idle: {
        state: "idle";
        location: undefined;
        formMethod: undefined;
        formAction: undefined;
        formEncType: undefined;
        formData: undefined;
        json: undefined;
        text: undefined;
    };
    Loading: {
        state: "loading";
        location: Location;
        formMethod: Submission["formMethod"] | undefined;
        formAction: Submission["formAction"] | undefined;
        formEncType: Submission["formEncType"] | undefined;
        formData: Submission["formData"] | undefined;
        json: Submission["json"] | undefined;
        text: Submission["text"] | undefined;
    };
    Submitting: {
        state: "submitting";
        location: Location;
        formMethod: Submission["formMethod"];
        formAction: Submission["formAction"];
        formEncType: Submission["formEncType"];
        formData: Submission["formData"];
        json: Submission["json"];
        text: Submission["text"];
    };
};
type Navigation = NavigationStates[keyof NavigationStates];
type RevalidationState = "idle" | "loading";
/**
 * Potential states for fetchers
 */
type FetcherStates<TData = any> = {
    /**
     * The fetcher is not calling a loader or action
     *
     * ```tsx
     * fetcher.state === "idle"
     * ```
     */
    Idle: {
        state: "idle";
        formMethod: undefined;
        formAction: undefined;
        formEncType: undefined;
        text: undefined;
        formData: undefined;
        json: undefined;
        /**
         * If the fetcher has never been called, this will be undefined.
         */
        data: TData | undefined;
    };
    /**
     * The fetcher is loading data from a {@link LoaderFunction | loader} from a
     * call to {@link FetcherWithComponents.load | `fetcher.load`}.
     *
     * ```tsx
     * // somewhere
     * <button onClick={() => fetcher.load("/some/route") }>Load</button>
     *
     * // the state will update
     * fetcher.state === "loading"
     * ```
     */
    Loading: {
        state: "loading";
        formMethod: Submission["formMethod"] | undefined;
        formAction: Submission["formAction"] | undefined;
        formEncType: Submission["formEncType"] | undefined;
        text: Submission["text"] | undefined;
        formData: Submission["formData"] | undefined;
        json: Submission["json"] | undefined;
        data: TData | undefined;
    };
    /**
      The fetcher is submitting to a {@link LoaderFunction} (GET) or {@link ActionFunction} (POST) from a {@link FetcherWithComponents.Form | `fetcher.Form`} or {@link FetcherWithComponents.submit | `fetcher.submit`}.
  
      ```tsx
      // somewhere
      <input
        onChange={e => {
          fetcher.submit(event.currentTarget.form, { method: "post" });
        }}
      />
  
      // the state will update
      fetcher.state === "submitting"
  
      // and formData will be available
      fetcher.formData
      ```
     */
    Submitting: {
        state: "submitting";
        formMethod: Submission["formMethod"];
        formAction: Submission["formAction"];
        formEncType: Submission["formEncType"];
        text: Submission["text"];
        formData: Submission["formData"];
        json: Submission["json"];
        data: TData | undefined;
    };
};
type Fetcher<TData = any> = FetcherStates<TData>[keyof FetcherStates<TData>];
interface BlockerBlocked {
    state: "blocked";
    reset: () => void;
    proceed: () => void;
    location: Location;
}
interface BlockerUnblocked {
    state: "unblocked";
    reset: undefined;
    proceed: undefined;
    location: undefined;
}
interface BlockerProceeding {
    state: "proceeding";
    reset: undefined;
    proceed: undefined;
    location: Location;
}
type Blocker = BlockerUnblocked | BlockerBlocked | BlockerProceeding;
type BlockerFunction = (args: {
    currentLocation: Location;
    nextLocation: Location;
    historyAction: Action;
}) => boolean;
declare const IDLE_NAVIGATION: NavigationStates["Idle"];
declare const IDLE_FETCHER: FetcherStates["Idle"];
declare const IDLE_BLOCKER: BlockerUnblocked;
/**
 * Create a router and listen to history POP navigations
 */
declare function createRouter(init: RouterInit): Router;
interface CreateStaticHandlerOptions {
    basename?: string;
    mapRouteProperties?: MapRoutePropertiesFunction;
    future?: {};
}

interface IndexRouteObject {
    caseSensitive?: AgnosticIndexRouteObject["caseSensitive"];
    path?: AgnosticIndexRouteObject["path"];
    id?: AgnosticIndexRouteObject["id"];
    unstable_middleware?: AgnosticIndexRouteObject["unstable_middleware"];
    loader?: AgnosticIndexRouteObject["loader"];
    action?: AgnosticIndexRouteObject["action"];
    hasErrorBoundary?: AgnosticIndexRouteObject["hasErrorBoundary"];
    shouldRevalidate?: AgnosticIndexRouteObject["shouldRevalidate"];
    handle?: AgnosticIndexRouteObject["handle"];
    index: true;
    children?: undefined;
    element?: React.ReactNode | null;
    hydrateFallbackElement?: React.ReactNode | null;
    errorElement?: React.ReactNode | null;
    Component?: React.ComponentType | null;
    HydrateFallback?: React.ComponentType | null;
    ErrorBoundary?: React.ComponentType | null;
    lazy?: LazyRouteDefinition<RouteObject>;
}
interface NonIndexRouteObject {
    caseSensitive?: AgnosticNonIndexRouteObject["caseSensitive"];
    path?: AgnosticNonIndexRouteObject["path"];
    id?: AgnosticNonIndexRouteObject["id"];
    unstable_middleware?: AgnosticNonIndexRouteObject["unstable_middleware"];
    loader?: AgnosticNonIndexRouteObject["loader"];
    action?: AgnosticNonIndexRouteObject["action"];
    hasErrorBoundary?: AgnosticNonIndexRouteObject["hasErrorBoundary"];
    shouldRevalidate?: AgnosticNonIndexRouteObject["shouldRevalidate"];
    handle?: AgnosticNonIndexRouteObject["handle"];
    index?: false;
    children?: RouteObject[];
    element?: React.ReactNode | null;
    hydrateFallbackElement?: React.ReactNode | null;
    errorElement?: React.ReactNode | null;
    Component?: React.ComponentType | null;
    HydrateFallback?: React.ComponentType | null;
    ErrorBoundary?: React.ComponentType | null;
    lazy?: LazyRouteDefinition<RouteObject>;
}
type RouteObject = IndexRouteObject | NonIndexRouteObject;
type DataRouteObject = RouteObject & {
    children?: DataRouteObject[];
    id: string;
};
interface RouteMatch<ParamKey extends string = string, RouteObjectType extends RouteObject = RouteObject> extends AgnosticRouteMatch<ParamKey, RouteObjectType> {
}
interface DataRouteMatch extends RouteMatch<string, DataRouteObject> {
}
type PatchRoutesOnNavigationFunctionArgs = AgnosticPatchRoutesOnNavigationFunctionArgs<RouteObject, RouteMatch>;
type PatchRoutesOnNavigationFunction = AgnosticPatchRoutesOnNavigationFunction<RouteObject, RouteMatch>;
interface DataRouterContextObject extends Omit<NavigationContextObject, "future"> {
    router: Router;
    staticContext?: StaticHandlerContext;
}
declare const DataRouterContext: React.Context<DataRouterContextObject | null>;
declare const DataRouterStateContext: React.Context<RouterState | null>;
type ViewTransitionContextObject = {
    isTransitioning: false;
} | {
    isTransitioning: true;
    flushSync: boolean;
    currentLocation: Location;
    nextLocation: Location;
};
declare const ViewTransitionContext: React.Context<ViewTransitionContextObject>;
type FetchersContextObject = Map<string, any>;
declare const FetchersContext: React.Context<FetchersContextObject>;
interface NavigateOptions {
    /** Replace the current entry in the history stack instead of pushing a new one */
    replace?: boolean;
    /** Adds persistent client side routing state to the next location */
    state?: any;
    /** If you are using {@link https://api.reactrouter.com/v7/functions/react_router.ScrollRestoration.html <ScrollRestoration>}, prevent the scroll position from being reset to the top of the window when navigating */
    preventScrollReset?: boolean;
    /** Defines the relative path behavior for the link. "route" will use the route hierarchy so ".." will remove all URL segments of the current route pattern while "path" will use the URL path so ".." will remove one URL segment. */
    relative?: RelativeRoutingType;
    /** Wraps the initial state update for this navigation in a {@link https://react.dev/reference/react-dom/flushSync ReactDOM.flushSync} call instead of the default {@link https://react.dev/reference/react/startTransition React.startTransition} */
    flushSync?: boolean;
    /** Enables a {@link https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API View Transition} for this navigation by wrapping the final state update in `document.startViewTransition()`. If you need to apply specific styles for this view transition, you will also need to leverage the {@link https://api.reactrouter.com/v7/functions/react_router.useViewTransitionState.html useViewTransitionState()} hook.  */
    viewTransition?: boolean;
}
/**
 * A Navigator is a "location changer"; it's how you get to different locations.
 *
 * Every history instance conforms to the Navigator interface, but the
 * distinction is useful primarily when it comes to the low-level `<Router>` API
 * where both the location and a navigator must be provided separately in order
 * to avoid "tearing" that may occur in a suspense-enabled app if the action
 * and/or location were to be read directly from the history instance.
 */
interface Navigator {
    createHref: History["createHref"];
    encodeLocation?: History["encodeLocation"];
    go: History["go"];
    push(to: To, state?: any, opts?: NavigateOptions): void;
    replace(to: To, state?: any, opts?: NavigateOptions): void;
}
interface NavigationContextObject {
    basename: string;
    navigator: Navigator;
    static: boolean;
    future: {};
}
declare const NavigationContext: React.Context<NavigationContextObject>;
interface LocationContextObject {
    location: Location;
    navigationType: Action;
}
declare const LocationContext: React.Context<LocationContextObject>;
interface RouteContextObject {
    outlet: React.ReactElement | null;
    matches: RouteMatch[];
    isDataRoute: boolean;
}
declare const RouteContext: React.Context<RouteContextObject>;

type Primitive = null | undefined | string | number | boolean | symbol | bigint;
type LiteralUnion<LiteralType, BaseType extends Primitive> = LiteralType | (BaseType & Record<never, never>);
interface HtmlLinkProps {
    /**
     * Address of the hyperlink
     */
    href?: string;
    /**
     * How the element handles crossorigin requests
     */
    crossOrigin?: "anonymous" | "use-credentials";
    /**
     * Relationship between the document containing the hyperlink and the destination resource
     */
    rel: LiteralUnion<"alternate" | "dns-prefetch" | "icon" | "manifest" | "modulepreload" | "next" | "pingback" | "preconnect" | "prefetch" | "preload" | "prerender" | "search" | "stylesheet", string>;
    /**
     * Applicable media: "screen", "print", "(max-width: 764px)"
     */
    media?: string;
    /**
     * Integrity metadata used in Subresource Integrity checks
     */
    integrity?: string;
    /**
     * Language of the linked resource
     */
    hrefLang?: string;
    /**
     * Hint for the type of the referenced resource
     */
    type?: string;
    /**
     * Referrer policy for fetches initiated by the element
     */
    referrerPolicy?: "" | "no-referrer" | "no-referrer-when-downgrade" | "same-origin" | "origin" | "strict-origin" | "origin-when-cross-origin" | "strict-origin-when-cross-origin" | "unsafe-url";
    /**
     * Sizes of the icons (for rel="icon")
     */
    sizes?: string;
    /**
     * Potential destination for a preload request (for rel="preload" and rel="modulepreload")
     */
    as?: LiteralUnion<"audio" | "audioworklet" | "document" | "embed" | "fetch" | "font" | "frame" | "iframe" | "image" | "manifest" | "object" | "paintworklet" | "report" | "script" | "serviceworker" | "sharedworker" | "style" | "track" | "video" | "worker" | "xslt", string>;
    /**
     * Color to use when customizing a site's icon (for rel="mask-icon")
     */
    color?: string;
    /**
     * Whether the link is disabled
     */
    disabled?: boolean;
    /**
     * The title attribute has special semantics on this element: Title of the link; CSS style sheet set name.
     */
    title?: string;
    /**
     * Images to use in different situations, e.g., high-resolution displays,
     * small monitors, etc. (for rel="preload")
     */
    imageSrcSet?: string;
    /**
     * Image sizes for different page layouts (for rel="preload")
     */
    imageSizes?: string;
}
interface HtmlLinkPreloadImage extends HtmlLinkProps {
    /**
     * Relationship between the document containing the hyperlink and the destination resource
     */
    rel: "preload";
    /**
     * Potential destination for a preload request (for rel="preload" and rel="modulepreload")
     */
    as: "image";
    /**
     * Address of the hyperlink
     */
    href?: string;
    /**
     * Images to use in different situations, e.g., high-resolution displays,
     * small monitors, etc. (for rel="preload")
     */
    imageSrcSet: string;
    /**
     * Image sizes for different page layouts (for rel="preload")
     */
    imageSizes?: string;
}
/**
 * Represents a `<link>` element.
 *
 * WHATWG Specification: https://html.spec.whatwg.org/multipage/semantics.html#the-link-element
 */
type HtmlLinkDescriptor = (HtmlLinkProps & Pick<Required<HtmlLinkProps>, "href">) | (HtmlLinkPreloadImage & Pick<Required<HtmlLinkPreloadImage>, "imageSizes">) | (HtmlLinkPreloadImage & Pick<Required<HtmlLinkPreloadImage>, "href"> & {
    imageSizes?: never;
});
interface PageLinkDescriptor extends Omit<HtmlLinkDescriptor, "href" | "rel" | "type" | "sizes" | "imageSrcSet" | "imageSizes" | "as" | "color" | "title"> {
    /**
     * A [`nonce`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/nonce)
     * attribute to render on the [`<link>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link)
     * element
     */
    nonce?: string | undefined;
    /**
     * The absolute path of the page to prefetch, e.g. `/absolute/path`.
     */
    page: string;
}
type LinkDescriptor = HtmlLinkDescriptor | PageLinkDescriptor;

/**
 * An object of unknown type for route loaders and actions provided by the
 * server's `getLoadContext()` function.  This is defined as an empty interface
 * specifically so apps can leverage declaration merging to augment this type
 * globally: https://www.typescriptlang.org/docs/handbook/declaration-merging.html
 */
interface AppLoadContext {
    [key: string]: unknown;
}

type Serializable = undefined | null | boolean | string | symbol | number | Array<Serializable> | {
    [key: PropertyKey]: Serializable;
} | bigint | Date | URL | RegExp | Error | Map<Serializable, Serializable> | Set<Serializable> | Promise<Serializable>;

type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false;
type IsAny<T> = 0 extends 1 & T ? true : false;
type Func = (...args: any[]) => unknown;
type Pretty<T> = {
    [K in keyof T]: T[K];
} & {};
type Normalize<T> = _Normalize<UnionKeys<T>, T>;
type _Normalize<Key extends keyof any, T> = T extends infer U ? Pretty<{
    [K in Key as K extends keyof U ? undefined extends U[K] ? never : K : never]: K extends keyof U ? U[K] : never;
} & {
    [K in Key as K extends keyof U ? undefined extends U[K] ? K : never : never]?: K extends keyof U ? U[K] : never;
} & {
    [K in Key as K extends keyof U ? never : K]?: undefined;
}> : never;
type UnionKeys<T> = T extends any ? keyof T : never;

type RouteModule$1 = {
    meta?: Func;
    links?: Func;
    headers?: Func;
    loader?: Func;
    clientLoader?: Func;
    action?: Func;
    clientAction?: Func;
    HydrateFallback?: Func;
    default?: Func;
    ErrorBoundary?: Func;
    [key: string]: unknown;
};

/**
 * A brand that can be applied to a type to indicate that it will serialize
 * to a specific type when transported to the client from a loader.
 * Only use this if you have additional serialization/deserialization logic
 * in your application.
 */
type unstable_SerializesTo<T> = {
    unstable__ReactRouter_SerializesTo: [T];
};

type Serialize<T> = T extends unstable_SerializesTo<infer To> ? To : T extends Serializable ? T : T extends (...args: any[]) => unknown ? undefined : T extends Promise<infer U> ? Promise<Serialize<U>> : T extends Map<infer K, infer V> ? Map<Serialize<K>, Serialize<V>> : T extends Set<infer U> ? Set<Serialize<U>> : T extends [] ? [] : T extends readonly [infer F, ...infer R] ? [Serialize<F>, ...Serialize<R>] : T extends Array<infer U> ? Array<Serialize<U>> : T extends readonly unknown[] ? readonly Serialize<T[number]>[] : T extends Record<any, any> ? {
    [K in keyof T]: Serialize<T[K]>;
} : undefined;
type VoidToUndefined<T> = Equal<T, void> extends true ? undefined : T;
type DataFrom<T> = IsAny<T> extends true ? undefined : T extends Func ? VoidToUndefined<Awaited<ReturnType<T>>> : undefined;
type ClientData<T> = T extends Response ? never : T extends DataWithResponseInit<infer U> ? U : T;
type ServerData<T> = T extends Response ? never : T extends DataWithResponseInit<infer U> ? Serialize<U> : Serialize<T>;
type ServerDataFrom<T> = ServerData<DataFrom<T>>;
type ClientDataFrom<T> = ClientData<DataFrom<T>>;
type ClientDataFunctionArgs<Params> = {
    /**
     * A {@link https://developer.mozilla.org/en-US/docs/Web/API/Request Fetch Request instance} which you can use to read the URL, the method, the "content-type" header, and the request body from the request.
     *
     * @note Because client data functions are called before a network request is made, the Request object does not include the headers which the browser automatically adds. React Router infers the "content-type" header from the enc-type of the form that performed the submission.
     **/
    request: Request;
    /**
     * {@link https://reactrouter.com/start/framework/routing#dynamic-segments Dynamic route params} for the current route.
     * @example
     * // app/routes.ts
     * route("teams/:teamId", "./team.tsx"),
     *
     * // app/team.tsx
     * export function clientLoader({
     *   params,
     * }: Route.ClientLoaderArgs) {
     *   params.teamId;
     *   //        ^ string
     * }
     **/
    params: Params;
    /**
     * When `future.unstable_middleware` is not enabled, this is undefined.
     *
     * When `future.unstable_middleware` is enabled, this is an instance of
     * `unstable_RouterContextProvider` and can be used to access context values
     * from your route middlewares.  You may pass in initial context values in your
     * `<HydratedRouter unstable_getContext>` prop
     */
    context: Readonly<unstable_RouterContextProvider>;
};
type ServerDataFunctionArgs<Params> = {
    /** A {@link https://developer.mozilla.org/en-US/docs/Web/API/Request Fetch Request instance} which you can use to read the url, method, headers (such as cookies), and request body from the request. */
    request: Request;
    /**
     * {@link https://reactrouter.com/start/framework/routing#dynamic-segments Dynamic route params} for the current route.
     * @example
     * // app/routes.ts
     * route("teams/:teamId", "./team.tsx"),
     *
     * // app/team.tsx
     * export function loader({
     *   params,
     * }: Route.LoaderArgs) {
     *   params.teamId;
     *   //        ^ string
     * }
     **/
    params: Params;
    /**
     * Without `future.unstable_middleware` enabled, this is the context passed in
     * to your server adapter's `getLoadContext` function. It's a way to bridge the
     * gap between the adapter's request/response API with your React Router app.
     * It is only applicable if you are using a custom server adapter.
     *
     * With `future.unstable_middleware` enabled, this is an instance of
     * `unstable_RouterContextProvider` and can be used for type-safe access to
     * context value set in your route middlewares.  If you are using a custom
     * server adapter, you may provide an initial set of context values from your
     * `getLoadContext` function.
     */
    context: MiddlewareEnabled extends true ? Readonly<unstable_RouterContextProvider> : AppLoadContext;
};
type SerializeFrom<T> = T extends (...args: infer Args) => unknown ? Args extends [
    ClientLoaderFunctionArgs | ClientActionFunctionArgs | ClientDataFunctionArgs<unknown>
] ? ClientDataFrom<T> : ServerDataFrom<T> : T;
type IsDefined<T> = Equal<T, undefined> extends true ? false : true;
type IsHydrate<ClientLoader> = ClientLoader extends {
    hydrate: true;
} ? true : ClientLoader extends {
    hydrate: false;
} ? false : false;
type GetLoaderData<T extends RouteModule$1> = _DataLoaderData<ServerDataFrom<T["loader"]>, ClientDataFrom<T["clientLoader"]>, IsHydrate<T["clientLoader"]>, T extends {
    HydrateFallback: Func;
} ? true : false>;
type _DataLoaderData<ServerLoaderData, ClientLoaderData, ClientLoaderHydrate extends boolean, HasHydrateFallback> = [
    HasHydrateFallback,
    ClientLoaderHydrate
] extends [true, true] ? IsDefined<ClientLoaderData> extends true ? ClientLoaderData : undefined : [
    IsDefined<ClientLoaderData>,
    IsDefined<ServerLoaderData>
] extends [true, true] ? ServerLoaderData | ClientLoaderData : IsDefined<ClientLoaderData> extends true ? ClientLoaderData : IsDefined<ServerLoaderData> extends true ? ServerLoaderData : undefined;
type GetActionData<T extends RouteModule$1> = _DataActionData<ServerDataFrom<T["action"]>, ClientDataFrom<T["clientAction"]>>;
type _DataActionData<ServerActionData, ClientActionData> = Awaited<[
    IsDefined<ServerActionData>,
    IsDefined<ClientActionData>
] extends [true, true] ? ServerActionData | ClientActionData : IsDefined<ClientActionData> extends true ? ClientActionData : IsDefined<ServerActionData> extends true ? ServerActionData : undefined>;

interface RouteModules {
    [routeId: string]: RouteModule | undefined;
}
/**
 * The shape of a route module shipped to the client
 */
interface RouteModule {
    clientAction?: ClientActionFunction;
    clientLoader?: ClientLoaderFunction;
    unstable_clientMiddleware?: unstable_MiddlewareFunction<undefined>[];
    ErrorBoundary?: ErrorBoundaryComponent;
    HydrateFallback?: HydrateFallbackComponent;
    Layout?: LayoutComponent;
    default: RouteComponent;
    handle?: RouteHandle;
    links?: LinksFunction;
    meta?: MetaFunction;
    shouldRevalidate?: ShouldRevalidateFunction;
}
/**
 * The shape of a route module on the server
 */
interface ServerRouteModule extends RouteModule {
    action?: ActionFunction;
    headers?: HeadersFunction | {
        [name: string]: string;
    };
    loader?: LoaderFunction;
    unstable_middleware?: unstable_MiddlewareFunction<Response>[];
}
/**
 * A function that handles data mutations for a route on the client
 */
type ClientActionFunction = (args: ClientActionFunctionArgs) => ReturnType<ActionFunction>;
/**
 * Arguments passed to a route `clientAction` function
 */
type ClientActionFunctionArgs = ActionFunctionArgs & {
    serverAction: <T = unknown>() => Promise<SerializeFrom<T>>;
};
/**
 * A function that loads data for a route on the client
 */
type ClientLoaderFunction = ((args: ClientLoaderFunctionArgs) => ReturnType<LoaderFunction>) & {
    hydrate?: boolean;
};
/**
 * Arguments passed to a route `clientLoader` function
 */
type ClientLoaderFunctionArgs = LoaderFunctionArgs & {
    serverLoader: <T = unknown>() => Promise<SerializeFrom<T>>;
};
/**
 * ErrorBoundary to display for this route
 */
type ErrorBoundaryComponent = ComponentType;
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
 * `<Route HydrateFallback>` component to render on initial loads
 * when client loaders are present
 */
type HydrateFallbackComponent = ComponentType;
/**
 * Optional, root-only `<Route Layout>` component to wrap the root content in.
 * Useful for defining the <html>/<head>/<body> document shell shared by the
 * Component, HydrateFallback, and ErrorBoundary
 */
type LayoutComponent = ComponentType<{
    children: ReactElement<unknown, ErrorBoundaryComponent | HydrateFallbackComponent | RouteComponent>;
}>;
/**
 * A function that defines `<link>` tags to be inserted into the `<head>` of
 * the document on route transitions.
 *
 * @see https://remix.run/route/meta
 */
interface LinksFunction {
    (): LinkDescriptor[];
}
interface MetaMatch<RouteId extends string = string, Loader extends LoaderFunction | ClientLoaderFunction | unknown = unknown> {
    id: RouteId;
    pathname: DataRouteMatch["pathname"];
    /** @deprecated Use `MetaMatch.loaderData` instead */
    data: Loader extends LoaderFunction | ClientLoaderFunction ? SerializeFrom<Loader> : unknown;
    loaderData: Loader extends LoaderFunction | ClientLoaderFunction ? SerializeFrom<Loader> : unknown;
    handle?: RouteHandle;
    params: DataRouteMatch["params"];
    meta: MetaDescriptor[];
    error?: unknown;
}
type MetaMatches<MatchLoaders extends Record<string, LoaderFunction | ClientLoaderFunction | unknown> = Record<string, unknown>> = Array<{
    [K in keyof MatchLoaders]: MetaMatch<Exclude<K, number | symbol>, MatchLoaders[K]>;
}[keyof MatchLoaders]>;
interface MetaArgs<Loader extends LoaderFunction | ClientLoaderFunction | unknown = unknown, MatchLoaders extends Record<string, LoaderFunction | ClientLoaderFunction | unknown> = Record<string, unknown>> {
    /** @deprecated Use `MetaArgs.loaderData` instead */
    data: (Loader extends LoaderFunction | ClientLoaderFunction ? SerializeFrom<Loader> : unknown) | undefined;
    loaderData: (Loader extends LoaderFunction | ClientLoaderFunction ? SerializeFrom<Loader> : unknown) | undefined;
    params: Params;
    location: Location;
    matches: MetaMatches<MatchLoaders>;
    error?: unknown;
}
/**
 * A function that returns an array of data objects to use for rendering
 * metadata HTML tags in a route. These tags are not rendered on descendant
 * routes in the route hierarchy. In other words, they will only be rendered on
 * the route in which they are exported.
 *
 * @param Loader - The type of the current route's loader function
 * @param MatchLoaders - Mapping from a parent route's filepath to its loader
 * function type
 *
 * Note that parent route filepaths are relative to the `app/` directory.
 *
 * For example, if this meta function is for `/sales/customers/$customerId`:
 *
 * ```ts
 * // app/root.tsx
 * const loader = () => ({ hello: "world" })
 * export type Loader = typeof loader
 *
 * // app/routes/sales.tsx
 * const loader = () => ({ salesCount: 1074 })
 * export type Loader = typeof loader
 *
 * // app/routes/sales/customers.tsx
 * const loader = () => ({ customerCount: 74 })
 * export type Loader = typeof loader
 *
 * // app/routes/sales/customers/$customersId.tsx
 * import type { Loader as RootLoader } from "../../../root"
 * import type { Loader as SalesLoader } from "../../sales"
 * import type { Loader as CustomersLoader } from "../../sales/customers"
 *
 * const loader = () => ({ name: "Customer name" })
 *
 * const meta: MetaFunction<typeof loader, {
 *  "root": RootLoader,
 *  "routes/sales": SalesLoader,
 *  "routes/sales/customers": CustomersLoader,
 * }> = ({ data, matches }) => {
 *   const { name } = data
 *   //      ^? string
 *   const { customerCount } = matches.find((match) => match.id === "routes/sales/customers").data
 *   //      ^? number
 *   const { salesCount } = matches.find((match) => match.id === "routes/sales").data
 *   //      ^? number
 *   const { hello } = matches.find((match) => match.id === "root").data
 *   //      ^? "world"
 * }
 * ```
 */
interface MetaFunction<Loader extends LoaderFunction | ClientLoaderFunction | unknown = unknown, MatchLoaders extends Record<string, LoaderFunction | ClientLoaderFunction | unknown> = Record<string, unknown>> {
    (args: MetaArgs<Loader, MatchLoaders>): MetaDescriptor[] | undefined;
}
type MetaDescriptor = {
    charSet: "utf-8";
} | {
    title: string;
} | {
    name: string;
    content: string;
} | {
    property: string;
    content: string;
} | {
    httpEquiv: string;
    content: string;
} | {
    "script:ld+json": LdJsonObject;
} | {
    tagName: "meta" | "link";
    [name: string]: string;
} | {
    [name: string]: unknown;
};
type LdJsonObject = {
    [Key in string]: LdJsonValue;
} & {
    [Key in string]?: LdJsonValue | undefined;
};
type LdJsonArray = LdJsonValue[] | readonly LdJsonValue[];
type LdJsonPrimitive = string | number | boolean | null;
type LdJsonValue = LdJsonPrimitive | LdJsonObject | LdJsonArray;
/**
 * A React component that is rendered for a route.
 */
type RouteComponent = ComponentType<{}>;
/**
 * An arbitrary object that is associated with a route.
 *
 * @see https://remix.run/route/handle
 */
type RouteHandle = unknown;

export { type GetScrollRestorationKeyFunction as $, Action as A, type BlockerFunction as B, type ClientDataFunctionArgs as C, type DataStrategyFunction as D, type Equal as E, type Func as F, type GetLoaderData as G, type HydrationState as H, type InitialEntry as I, type ClientActionFunction as J, type ClientLoaderFunction as K, type LinkDescriptor as L, type MetaDescriptor as M, type Normalize as N, type HeadersFunction as O, type Pretty as P, type ShouldRevalidateFunction as Q, type RouteModule$1 as R, type ServerDataFunctionArgs as S, type To as T, type UIMatch as U, type RouterInit as V, type RouterState as W, type PatchRoutesOnNavigationFunction as X, type DataRouteObject as Y, type StaticHandler as Z, type GetScrollPositionFunction as _, type Location as a, type ServerRouteModule as a$, type StaticHandlerContext as a0, type Fetcher as a1, type NavigationStates as a2, type RouterSubscriber as a3, type RouterNavigateOptions as a4, type RouterFetchOptions as a5, type RevalidationState as a6, type ActionFunctionArgs as a7, type DataStrategyFunctionArgs as a8, type DataStrategyMatch as a9, replace as aA, resolvePath as aB, type DataRouteMatch as aC, type Navigator as aD, type PatchRoutesOnNavigationFunctionArgs as aE, type RouteMatch as aF, type ClientActionFunctionArgs as aG, type ClientLoaderFunctionArgs as aH, type HeadersArgs as aI, type MetaArgs as aJ, type PageLinkDescriptor as aK, type HtmlLinkDescriptor as aL, type Future as aM, type unstable_SerializesTo as aN, createBrowserHistory as aO, invariant as aP, createRouter as aQ, ErrorResponseImpl as aR, DataRouterContext as aS, DataRouterStateContext as aT, FetchersContext as aU, LocationContext as aV, NavigationContext as aW, RouteContext as aX, ViewTransitionContext as aY, type FutureConfig as aZ, type RouteManifest as a_, type DataStrategyResult as aa, DataWithResponseInit as ab, type ErrorResponse as ac, type FormEncType as ad, type FormMethod as ae, type HTMLFormMethod as af, type LazyRouteFunction as ag, type LoaderFunctionArgs as ah, type unstable_MiddlewareFunction as ai, type PathParam as aj, type RedirectFunction as ak, type unstable_RouterContext as al, type ShouldRevalidateFunctionArgs as am, unstable_createContext as an, createPath as ao, parsePath as ap, IDLE_NAVIGATION as aq, IDLE_FETCHER as ar, IDLE_BLOCKER as as, data as at, generatePath as au, isRouteErrorResponse as av, matchPath as aw, matchRoutes as ax, redirect as ay, redirectDocument as az, type ServerDataFrom as b, type History as b0, type CreateStaticHandlerOptions as b1, type GetActionData as c, type Router as d, type RouteModules as e, type NavigateOptions as f, type Blocker as g, type SerializeFrom as h, type RelativeRoutingType as i, type ParamParseKey as j, type Path as k, type PathPattern as l, type PathMatch as m, type Navigation as n, type Params as o, type RouteObject as p, type IndexRouteObject as q, type LoaderFunction as r, type ActionFunction as s, type MetaFunction as t, type unstable_MiddlewareNextFunction as u, type LinksFunction as v, type NonIndexRouteObject as w, type AppLoadContext as x, unstable_RouterContextProvider as y, type MiddlewareEnabled as z };
