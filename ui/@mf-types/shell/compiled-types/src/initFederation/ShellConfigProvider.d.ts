/// <reference types="react" />
import { CoreUITheme, CoreUIThemeName } from '@scality/core-ui/dist/style/theme';
export type NavbarEntry = {
    groups?: string[];
    label?: {
        en: string;
        fr: string;
    };
    kind?: string;
    view?: string;
    url?: string;
    icon?: string;
    isExternal: boolean;
};
export type UserGroupsMapping = Record<string, string[]>;
type CoreUIShellThemeDescription = {
    type: 'core-ui';
    name: CoreUIThemeName;
    logoPath: string;
};
type CustomShellThemeDescription = {
    type: 'custom';
    logoPath: string;
    colors: CoreUITheme;
};
type ThemeDescription = CoreUIShellThemeDescription | CustomShellThemeDescription;
type Themes = {
    dark: ThemeDescription;
    light: ThemeDescription;
};
export type ShellJSONFileConfig = {
    discoveryUrl: string;
    navbar: {
        main: NavbarEntry[];
        subLogin: NavbarEntry[];
    };
    productName: string;
    themes: Themes;
    favicon?: string;
    userGroupsMapping?: UserGroupsMapping;
    canChangeTheme?: boolean;
    canChangeInstanceName?: boolean;
    canChangeLanguage?: boolean;
};
export type ShellConfig = {
    config: ShellJSONFileConfig;
    favicon: Pick<ShellJSONFileConfig, 'favicon'>;
    themes: Themes;
    status: 'idle' | 'loading' | 'success' | 'error';
};
export declare const useShellConfig: () => ShellConfig;
export declare const ShellConfigProvider: ({ shellConfigUrl, children }: {
    shellConfigUrl: any;
    children: any;
}) => JSX.Element;
export {};
