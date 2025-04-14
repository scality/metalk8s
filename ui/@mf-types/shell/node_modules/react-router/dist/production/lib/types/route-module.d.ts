import { av as LinkDescriptor, as as MetaDescriptor, aJ as ServerDataFrom, aK as ClientDataFrom, aL as Func, aM as Equal, aN as Pretty } from '../../route-data-DuV3tXo2.js';
import { A as AppLoadContext } from '../../data-CQbyyGzl.js';
import 'react';

type IsDefined<T> = Equal<T, undefined> extends true ? false : true;
type RouteModule = {
    meta?: Func;
    links?: Func;
    headers?: Func;
    loader?: Func;
    clientLoader?: Func;
    action?: Func;
    clientAction?: Func;
    HydrateFallback?: unknown;
    default?: unknown;
    ErrorBoundary?: unknown;
    [key: string]: unknown;
};
type LinkDescriptors = LinkDescriptor[];
type RouteInfo = {
    parents: RouteInfo[];
    module: RouteModule;
    id: unknown;
    file: string;
    path: string;
    params: unknown;
    loaderData: unknown;
    actionData: unknown;
};
type MetaMatch<T extends RouteInfo> = Pretty<Pick<T, "id" | "params"> & {
    pathname: string;
    meta: MetaDescriptor[];
    data: T["loaderData"];
    handle?: unknown;
    error?: unknown;
}>;
type MetaMatches<T extends RouteInfo[]> = T extends [infer F extends RouteInfo, ...infer R extends RouteInfo[]] ? [MetaMatch<F>, ...MetaMatches<R>] : [];
type CreateMetaArgs<T extends RouteInfo> = {
    location: Location;
    params: T["params"];
    data: T["loaderData"];
    error?: unknown;
    matches: MetaMatches<T["parents"]>;
};
type MetaDescriptors = MetaDescriptor[];
type HeadersArgs = {
    loaderHeaders: Headers;
    parentHeaders: Headers;
    actionHeaders: Headers;
    errorHeaders: Headers | undefined;
};
type IsHydrate<ClientLoader> = ClientLoader extends {
    hydrate: true;
} ? true : ClientLoader extends {
    hydrate: false;
} ? false : false;
type CreateLoaderData<T extends RouteModule> = _CreateLoaderData<ServerDataFrom<T["loader"]>, ClientDataFrom<T["clientLoader"]>, IsHydrate<T["clientLoader"]>, T extends {
    HydrateFallback: Func;
} ? true : false>;
type _CreateLoaderData<ServerLoaderData, ClientLoaderData, ClientLoaderHydrate extends boolean, HasHydrateFallback> = [
    HasHydrateFallback,
    ClientLoaderHydrate
] extends [true, true] ? IsDefined<ClientLoaderData> extends true ? ClientLoaderData : undefined : [
    IsDefined<ClientLoaderData>,
    IsDefined<ServerLoaderData>
] extends [true, true] ? ServerLoaderData | ClientLoaderData : IsDefined<ClientLoaderData> extends true ? ClientLoaderData : IsDefined<ServerLoaderData> extends true ? ServerLoaderData : undefined;
type CreateActionData<T extends RouteModule> = _CreateActionData<ServerDataFrom<T["action"]>, ClientDataFrom<T["clientAction"]>>;
type _CreateActionData<ServerActionData, ClientActionData> = Awaited<[
    IsDefined<ServerActionData>,
    IsDefined<ClientActionData>
] extends [true, true] ? ServerActionData | ClientActionData : IsDefined<ClientActionData> extends true ? ClientActionData : IsDefined<ServerActionData> extends true ? ServerActionData : undefined>;
type ClientDataFunctionArgs<T extends RouteInfo> = {
    request: Request;
    params: T["params"];
};
type ServerDataFunctionArgs<T extends RouteInfo> = ClientDataFunctionArgs<T> & {
    context: AppLoadContext;
};
type CreateServerLoaderArgs<T extends RouteInfo> = ServerDataFunctionArgs<T>;
type CreateClientLoaderArgs<T extends RouteInfo> = ClientDataFunctionArgs<T> & {
    serverLoader: () => Promise<ServerDataFrom<T["module"]["loader"]>>;
};
type CreateServerActionArgs<T extends RouteInfo> = ServerDataFunctionArgs<T>;
type CreateClientActionArgs<T extends RouteInfo> = ClientDataFunctionArgs<T> & {
    serverAction: () => Promise<ServerDataFrom<T["module"]["action"]>>;
};
type CreateHydrateFallbackProps<T extends RouteInfo> = {
    params: T["params"];
};
type Match<T extends RouteInfo> = Pretty<Pick<T, "id" | "params"> & {
    pathname: string;
    data: T["loaderData"];
    handle: unknown;
}>;
type Matches<T extends RouteInfo[]> = T extends [infer F extends RouteInfo, ...infer R extends RouteInfo[]] ? [Match<F>, ...Matches<R>] : [];
type CreateComponentProps<T extends RouteInfo> = {
    params: T["params"];
    loaderData: T["loaderData"];
    actionData?: T["actionData"];
    matches: Matches<T["parents"]>;
};
type CreateErrorBoundaryProps<T extends RouteInfo> = {
    params: T["params"];
    error: unknown;
    loaderData?: T["loaderData"];
    actionData?: T["actionData"];
};

export type { CreateActionData, CreateClientActionArgs, CreateClientLoaderArgs, CreateComponentProps, CreateErrorBoundaryProps, CreateHydrateFallbackProps, CreateLoaderData, CreateMetaArgs, CreateServerActionArgs, CreateServerLoaderArgs, HeadersArgs, LinkDescriptors, MetaDescriptors };
