/// <reference types="react" />
import type { ViewDefinition } from '../initFederation/ConfigurationProviders';
import '../initFederation/ConfigurationProviders';
export type Link = {
    render?: (props: {
        selected?: boolean;
    }) => JSX.Element;
    view: ViewDefinition;
};
export type NavbarLinks = {
    main: Link[];
    secondary: Link[];
    userDropdown: Link[];
    logoHref: string;
};
export type Navbar = {
    setLogoLink(href: string): void;
    setMainLinks(links: Link[]): void;
    setSecondaryLinks(links: Link[]): void;
    setUserDropdownLinks(links: Link[]): void;
    getLinks(): NavbarLinks;
};
export declare const useNavbar: () => Navbar;
