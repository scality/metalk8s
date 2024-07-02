import { PropsWithChildren } from 'react';
import { UserData } from '../auth/AuthProvider';
export declare const InstanceNameProvider: ({ children }: PropsWithChildren<{}>) => JSX.Element;
export declare const useInstanceName: () => string;
export declare const useInstanceNameAdapter: () => {
    remoteEntryUrl: string;
    module: string;
    scope: string;
};
export declare const _InternalInstanceName: ({ moduleExports, }: {
    moduleExports: {
        [moduleName: string]: {
            getInstanceName: (userData: UserData | undefined) => Promise<string>;
            setInstanceName: (userData: UserData | undefined, name: string) => Promise<void>;
        };
    };
}) => JSX.Element;
export declare const InstanceName: () => JSX.Element;
