import React from 'react';
export declare function AuthProvider({ children }: {
    children: React.ReactNode;
}): JSX.Element;
export type UserData = {
    token: string;
    username: string;
    groups: string[];
    email: string;
    id: string;
};
export declare function useAuth(): {
    userData?: UserData;
    getToken: () => Promise<string | null>;
};
export declare function useLogOut(): {
    logOut: () => void;
};
