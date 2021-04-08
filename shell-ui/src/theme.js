//@flow
import React, { useContext, useState, type Node, useLayoutEffect } from 'react';
import { defaultTheme } from '@scality/core-ui/dist/style/theme';
import { THEME_CHANGED_EVENT } from "./events";


type ThemeName = 'dark' | 'light' | 'custom';
type ThemeContextValues = {
  themeName: ThemeName,
  theme: Theme,
  setTheme: (themeName: ThemeName) => void,
  unSelectedThemes: ThemeName[],
};
const ThemeContext = React.createContext<ThemeContextValues | null>(null);

const themes = ['dark', 'light'];

type Theme = { brand: typeof defaultTheme.dark };

export function useThemeName(): ThemeContextValues {
  const themeContext = useContext(ThemeContext);
  if (themeContext === null) {
    throw new Error("useTheme hook can't be use outside <ThemeProvider/>");
  }
  return { ...themeContext };
}

export function ThemeProvider({
  children,
  onThemeChanged,
}: {
  children: (theme: Theme, themeName: ThemeName) => Node,
  onThemeChanged?: (evt: CustomEvent) => void,
}): Node {
  const [themeName, setTheme] = useState<ThemeName>(
    (localStorage.getItem('theme'): any) || 'dark',
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
      onThemeChanged(new CustomEvent(THEME_CHANGED_EVENT, { detail: theme }));
    }
  }, [themeName, !!onThemeChanged]);

  return (
    <ThemeContext.Provider
      value={{ themeName, setTheme, theme, unSelectedThemes }}
    >
      {children(theme, themeName)}
    </ThemeContext.Provider>
  );
}
