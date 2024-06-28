import React from 'react';
import { ViewDefinition } from '../initFederation/ConfigurationProviders';
import type { Link as TypeLink } from './navbarHooks';
export declare const LoadingNavbar: ({ logo }: {
    logo: string;
}) => JSX.Element;
export declare const useNavbarLinksToActions: (links: TypeLink[]) => {
    link: TypeLink;
    selected: boolean;
}[];
export declare const useFederatedNavbarEntries: () => {
    accessibleViews: ViewDefinition[];
};
export declare const Navbar: ({ logo, canChangeLanguage, canChangeTheme, children, }: {
    logo: string;
    canChangeLanguage?: boolean;
    canChangeTheme?: boolean;
    providerLogout?: boolean;
    children?: React.ReactNode;
}) => JSX.Element;
