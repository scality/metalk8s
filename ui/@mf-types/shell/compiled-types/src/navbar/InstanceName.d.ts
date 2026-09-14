import { type UserData } from '../auth/AuthProvider';
import { type RuntimeWebFinger } from '../initFederation/ConfigurationProviders';
export declare const INSTANCE_NAME_QUERY_KEY = "instanceName";
export declare const useInstanceName: () => string;
export declare const useInstanceNameAdapter: () => {
    remoteEntryUrl: string;
    module: string;
    scope: string;
};
export declare const useInstanceNameConfiguration: () => {
    microAppConfiguration: import("../initFederation/ConfigurationProviders").EnrichedBuildtimeWebFinger;
    runtimeAppConfiguration: RuntimeWebFinger<Record<string, unknown>>;
};
export type InstanceNameAdapter = {
    getInstanceName: (userData: UserData | undefined, configuration: RuntimeWebFinger<Record<string, unknown>>) => Promise<string>;
    setInstanceName: (userData: UserData | undefined, name: string, configuration: RuntimeWebFinger<Record<string, unknown>>) => Promise<void>;
    checkInstanceName: (name: string) => {
        hasError: true;
        message: string;
    } | {
        hasError: false;
    };
};
export declare const _InternalInstanceName: ({ moduleExports, }: {
    moduleExports: {
        [moduleName: string]: {
            getInstanceName: InstanceNameAdapter["getInstanceName"];
            setInstanceName: InstanceNameAdapter["setInstanceName"];
            checkInstanceName?: InstanceNameAdapter["checkInstanceName"];
        };
    };
}) => import("react/jsx-runtime").JSX.Element;
export declare const InstanceName: () => import("react/jsx-runtime").JSX.Element;
