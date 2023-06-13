import React, { useContext, useState, useLayoutEffect } from 'react';
import { defaultTheme } from '@scality/core-ui/dist/style/theme';
import { THEME_CHANGED_EVENT } from './events';
type ThemeName = 'darkRebrand';
type ThemeContextValues = {
  themeName: ThemeName;
  theme: Theme;
  setTheme: (themeName: ThemeName) => void;
  unSelectedThemes: ThemeName[];
};

if (!window.shellContexts) {
  window.shellContexts = {};
}

if (!window.shellContexts.ShellThemeContext) {
  window.shellContexts.ShellThemeContext =
    React.createContext<ThemeContextValues | null>(null);
}

const themes = ['darkRebrand'];
export type Theme = {
  brand: typeof defaultTheme.darkRebrand;
};
export function useThemeName(): ThemeContextValues {
  const themeContext = useContext(window.shellContexts.ShellThemeContext);

  if (themeContext === null) {
    throw new Error("useTheme hook can't be use outside <ThemeProvider/>");
  }

  return { ...themeContext };
}
export function ThemeProvider({
  children,
  onThemeChanged,
}: {
  children: (theme: Theme, themeName: ThemeName) => React.ReactNode;
  onThemeChanged?: (evt: CustomEvent) => void;
}) {
  const [themeName, setTheme] = useState<ThemeName>(
    (localStorage.getItem('theme') as any) || 'darkRebrand',
  );
  const theme: Theme = {
    brand: defaultTheme[themeName],
  };
  const unSelectedThemes = themes.filter(
    (themeNameInThemes) => themeName !== themeNameInThemes,
  );
  useLayoutEffect(() => {
    localStorage.setItem('theme', themeName);

    if (onThemeChanged) {
      onThemeChanged(
        new CustomEvent(THEME_CHANGED_EVENT, {
          detail: theme,
        }),
      );
    }
  }, [themeName, !!onThemeChanged]);
  return (
    <window.shellContexts.ShellThemeContext.Provider
      value={{
        themeName,
        setTheme,
        theme,
        unSelectedThemes,
      }}
    >
      {children(theme, themeName)}
    </window.shellContexts.ShellThemeContext.Provider>
  );
}
