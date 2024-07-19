import { CoreUITheme } from '@scality/core-ui/dist/style/theme';
import React from 'react';
type ThemeMode = 'dark' | 'light';
type ThemeContextValues = {
    themeMode: ThemeMode;
    theme: CoreUITheme;
    setThemeMode: (themeMode: ThemeMode) => void;
    assets: {
        logoPath: string;
    };
};
export declare function useShellThemeSelector(): ThemeContextValues;
export declare function ShellThemeSelectorProvider({ children, }: {
    children: (theme: CoreUITheme, themeName: ThemeMode) => React.ReactNode;
    onThemeChanged?: (evt: CustomEvent) => void;
}): JSX.Element;
export {};
